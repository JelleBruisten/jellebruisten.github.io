import { inject, Injectable, isDevMode, signal } from "@angular/core";
import { GraphicsRuntime } from "./runtime";
import { RenderProgramHandles, RenderStrategy, RenderStrategyType } from "./types";
import { DOCUMENT } from "@angular/common";
import { printRenderInfo } from "./driver/debug";

/** Handle to a running shader program, its canvas, and a teardown callback. */
export interface ProgramRef {
  readonly name: string;
  readonly strategy: RenderStrategy;
  readonly programHandle: RenderProgramHandles | null;
  readonly canvas: HTMLCanvasElement;
  readonly destroy: () => void;
}

type Settings = Record<string, boolean | number>;

/**
 * Orchestrates the lifecycle of background shader programs.
 *
 * Responsible for creating canvases, loading and caching shader source files,
 * selecting the correct driver (WebGL / WebGPU) and execution context
 * (main thread / OffscreenCanvas worker), and measuring draw FPS.
 * Only one program runs at a time — switching names or strategies tears down
 * the previous program before starting a new one.
 */
@Injectable({
  providedIn: 'root',
})
export class BackgroundProgramManager {

  private readonly document = inject(DOCUMENT);
  private readonly runtime = inject(GraphicsRuntime);

  // lazy properties
  private shaderCache: Map<string, string> | undefined;
  private worker: Worker | undefined;
  private currentProgram: ProgramRef | null = null;

  // Draw FPS measurement — fed by onDraw callback (main thread) or worker messages
  readonly drawFps = signal(0);
  private drawCount = 0;
  private lastDrawCount = 0;
  private lastDrawTime = performance.now();
  private drawFpsInterval: ReturnType<typeof setInterval> | null = null;

  /** Starts a 500 ms interval that samples draw count deltas and updates the `drawFps` signal. */
  private startDrawFpsMeasurement() {
    this.stopDrawFpsMeasurement();
    this.drawCount = 0;
    this.lastDrawCount = 0;
    this.lastDrawTime = performance.now();
    this.drawFpsInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastDrawTime;
      const fps = Math.round(((this.drawCount - this.lastDrawCount) / elapsed) * 1000);
      this.drawFps.set(fps);
      this.lastDrawCount = this.drawCount;
      this.lastDrawTime = now;
    }, 500);
  }

  /** Clears the FPS sampling interval. */
  private stopDrawFpsMeasurement() {
    if (this.drawFpsInterval) {
      clearInterval(this.drawFpsInterval);
      this.drawFpsInterval = null;
    }
  }

  /**
   * Starts (or reuses) a shader program by name.
   * Falls back to the recommended render strategy if none is provided.
   * Returns the active {@link ProgramRef}, or the existing one if name and strategy are unchanged.
   */
  async startProgram(name: string, renderStrategy?: RenderStrategy | null, settings?: Settings) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    const program = await this.startProgramHelper(name, renderStrategy, settings);
    return program;
  }

  /**
   * Core program setup: tears down the previous program if the name or strategy
   * changed, creates a new canvas (half-res on mobile), and delegates to
   * offscreen or main-thread initialization.
   */
  private async startProgramHelper(name: string, renderStrategy: RenderStrategy, settings?: Settings) {
    if(this.currentProgram && this.currentProgram.name === name && this.currentProgram.strategy.offscreenRendering === renderStrategy.offscreenRendering && this.currentProgram.strategy.type == renderStrategy.type) {
      return this.currentProgram;
    }

    this.currentProgram?.destroy();

    // on small screens render at half resolution — the GPU is shared with the
    // compositor, so saturating it with a full-res shader causes scroll jank
    const scale = window.innerWidth < 768 ? 0.5 : 1.0;

    // create a new canvas and apply current window size
    const canvas = this.document.createElement('canvas');
    canvas.height = Math.round(window.innerHeight * scale);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    // program handles/worker references
    let programHandles: RenderProgramHandles | null = null;

    // start program either offscreen or normally
    if(renderStrategy.offscreenRendering) {
      programHandles = await this.startProgramOffscreen(name, canvas, renderStrategy, settings, scale);
    } else {
      programHandles = await this.startProgramNormally(name, canvas, renderStrategy, settings, scale);
      this.startDrawFpsMeasurement();
    }

    // construct a information object, with the current strategy, canvas, cleanup methods, handles for interacting with the graphics backend
    const cleanupController = new AbortController();
    const program: ProgramRef = {
      name: name,
      strategy: renderStrategy,
      programHandle: programHandles,
      canvas: canvas,
      destroy: () => {
        // stop program, remove canvas and terminate the worker if there is any
        programHandles?.stop();
        canvas?.remove();
        cleanupController?.abort();
      }
    };

    // in dev mode print render info
    if (isDevMode()) {
      printRenderInfo(program);
    }

    this.currentProgram = program;

    // return program
    return program;
  }

  /**
   * Transfers the canvas to an OffscreenCanvas and sends an `init` message
   * to the shared Web Worker. Returns a {@link RenderProgramHandles} proxy
   * that forwards all control messages via `postMessage`.
   */
  private async startProgramOffscreen(shaderName: string, canvas: HTMLCanvasElement, renderStrategy: RenderStrategy, settings: Settings = {}, scale = 1.0) {
    // worker
    const worker = this.getWorker();

    // setup program
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({
      canvas: offscreen,
      strategy: renderStrategy,
      width: Math.round((document.defaultView?.innerWidth ?? 300) * scale),
      height: Math.round((document.defaultView?.innerHeight ?? 300) * scale),
      shaderName: shaderName,
      settings: settings,
      type: 'init'
    }, [offscreen]);

    // setup worker
    const programHandles: RenderProgramHandles = {
      stop: () => {
        worker?.postMessage({ type: 'stop'})
      },
      resume: () => {
        worker?.postMessage({ type: 'resume'})
      },
      pause: () => {
        worker?.postMessage({ type: 'pause' })
      },
      resize: (width: number, height: number) => {
        worker?.postMessage({ type: 'resize', width: Math.round(width * scale), height: Math.round(height * scale)})
      },
      darkmode: (dark) => {
        worker?.postMessage({ type: 'darkmode', dark: dark});
      },
      setFpsLimit: (fps) => {
        worker?.postMessage({ type: 'fpsLimit', fps: fps});
      }
    }

    return programHandles;
  }

  /** Lazily creates and returns the shared Web Worker, listening for FPS reports. */
  private getWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('./driver/driver.worker', import.meta.url));
      this.worker.onmessage = (evt) => {
        if (evt.data.type === 'drawFps') {
          this.drawFps.set(evt.data.fps);
        }
      };
    }
    return this.worker;
  }

  /**
   * Initializes the shader on the main thread by lazy-importing the correct
   * driver (WebGL or WebGPU). Wraps resize calls to apply the resolution scale
   * factor when rendering at half resolution on mobile.
   */
  private async startProgramNormally(shaderName: string, canvas: HTMLCanvasElement, renderStrategy: RenderStrategy, settings: Settings = {}, scale = 1.0) {
    let programHandles: RenderProgramHandles | null = null;
    const options = {
      canvas: canvas,
      navigator: navigator,
      height: Math.round((document.defaultView?.innerHeight ?? 300) * scale),
      width: Math.round((document.defaultView?.innerWidth ?? 300) * scale),
      settings: settings,
      onDraw: () => { this.drawCount++; }
    } as const

    try {
      switch(renderStrategy.type) {
        case RenderStrategyType.WebGL: {
          const shaderSource = await this.resolveShader(`${shaderName}.glsl`);
          programHandles = await import('./driver/webgl.driver').then(async (x) => x.webGL2Driver({
            ...options,
            shaderSource: shaderSource
          }));
        }
        break;
        case RenderStrategyType.WebGPU: {
          const shaderSource = await this.resolveShader(`${shaderName}.wgsl`);
          programHandles = await import('./driver/webgpu.driver').then(async (x) => x.webGPUDriver({
            ...options,
            shaderSource: shaderSource
          }));
        }
        break;
      }
    } catch (err) {
      console.error(`[BackgroundProgramManager] Failed to start ${renderStrategy.type === RenderStrategyType.WebGPU ? 'WebGPU' : 'WebGL'} driver for "${shaderName}":`, err);
      return null;
    }

    if (programHandles && scale < 1) {
      const originalResize = programHandles.resize;
      programHandles = {
        ...programHandles,
        resize: (w: number, h: number) => originalResize(Math.round(w * scale), Math.round(h * scale))
      };
    }

    return programHandles;
  }

  /**
   * Prefetch a single background's shader into the in-memory cache.
   * Uses the current program's render strategy to pick the right file extension.
   */
  prefetchShader(backgroundName: string) {
    const strategyType = this.currentProgram?.strategy?.type;
    if (strategyType == null) return;
    const ext = strategyType === RenderStrategyType.WebGPU ? '.wgsl' : '.glsl';
    this.resolveShader(`${backgroundName}${ext}`);
  }

  /**
   * Prefetch the current background's shader for a different renderer type.
   */
  prefetchStrategy(strategyType: RenderStrategyType) {
    const name = this.currentProgram?.name;
    if (!name) return;
    const ext = strategyType === RenderStrategyType.WebGPU ? '.wgsl' : '.glsl';
    this.resolveShader(`${name}${ext}`);
  }

  /** Fetches a shader file by name, returning a cached copy if available. */
  private async resolveShader(shaderName: string) {
    // lazy create map
    if(this.shaderCache && this.shaderCache.has(shaderName)) {
      const cached = this.shaderCache.get(shaderName);

      if(cached) {
        return cached;
      }
    }

    const shaderSource = await fetch(`./shaders/${shaderName}`).then((x) => x.text());
    if(shaderSource) {

      // lazily create the cache if it does not exist
      this.shaderCache ??= new Map<string, string>();

      // set the shaderName
      this.shaderCache.set(shaderName, shaderSource);
    }
    return shaderSource as string;
  }
}

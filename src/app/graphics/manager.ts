import { inject, Injectable, isDevMode } from "@angular/core";
import { GraphicsRuntime } from "./runtime";
import { RenderProgramHandles, RenderProgramOptions, RenderStrategy, RenderStrategyType } from "./types";
import { DOCUMENT } from "@angular/common";
import { printRenderInfo } from "./driver/debug";

export interface ProgramRef { 
  readonly name: string; 
  readonly strategy: RenderStrategy; 
  readonly programHandle: RenderProgramHandles | null; 
  readonly canvas: HTMLCanvasElement; 
  readonly destroy: () => void; 
}

type Settings = Record<string, boolean | number>;

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

  async startProgram(name: string, renderStrategy?: RenderStrategy | null, settings?: Settings) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    const program = await this.startProgramHelper(name, renderStrategy, settings);
    return program;
  }

  private async startProgramHelper(name: string, renderStrategy: RenderStrategy, settings?: Settings) {
    if(this.currentProgram && this.currentProgram.name === name && this.currentProgram.strategy.offscreenRendering === renderStrategy.offscreenRendering && this.currentProgram.strategy.type == renderStrategy.type) {
      return this.currentProgram;
    }

    this.currentProgram?.destroy();

    // create a new canvas and apply current window size
    const canvas = this.document.createElement('canvas');
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';

    // program handles/worker references
    let programHandles: RenderProgramHandles | null = null;    

    // start program either offscreen or normally
    if(renderStrategy.offscreenRendering) {
      programHandles = await this.startProgramOffscreen(name, canvas, renderStrategy, settings)      
    } else {    
      programHandles = await this.startProgramNormally(name, canvas, renderStrategy, settings);
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
    isDevMode() && printRenderInfo(program);

    this.currentProgram = program;
    
    // return program
    return program;
  }

  private async startProgramOffscreen(shaderName: string,canvas: HTMLCanvasElement, renderStrategy: RenderStrategy, settings: Settings = {}) {
    // worker 
    const worker = this.getWorker();

    // setup program
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ 
      canvas: offscreen, 
      strategy: renderStrategy,
      width: document.defaultView?.innerWidth ?? 300,
      height: document.defaultView?.innerHeight ?? 300,
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
        worker?.postMessage({ type: 'resize', width: width, height: height})
      },
      mousemove: (x: number, y: number) => {
        worker?.postMessage({ type: 'mousemove', mouseX: x, mouseY: y});
      },
      darkmode: (dark) => {
        worker?.postMessage({ type: 'darkmode', dark: dark});
      }
    }

    return programHandles;
  }

  private getWorker() {
    this.worker ??= new Worker(new URL('./driver/driver.worker', import.meta.url));
    return this.worker;
  }

  private async startProgramNormally(shaderName: string, canvas: HTMLCanvasElement, renderStrategy: RenderStrategy, settings: Settings = {}) {
    let programHandles: RenderProgramHandles | null = null;
    const options = {
      canvas: canvas,
      navigator: navigator,
      height: document.defaultView?.innerHeight ?? 300,
      width: document.defaultView?.innerWidth ?? 300,  
      settings: settings    
    } as const

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

    return programHandles;
  }

  private async resolveShader(shaderName: string) {
    let shaderSource: string | null | undefined = null;

    // lazy create map
    if(this.shaderCache && this.shaderCache.has(shaderName)) {
      shaderSource = this.shaderCache.get(shaderName);

      if(shaderSource) {
        return shaderSource
      }
    }

    shaderSource = await fetch(`./shaders/${shaderName}`).then((x) => x.text());
    if(shaderSource) {

      // lazily create the cache if it does not exist
      this.shaderCache ??= new Map<string, string>();

      // set the shaderName
      this.shaderCache.set(shaderName, shaderSource);
    }
    return shaderSource as string;
  }
}
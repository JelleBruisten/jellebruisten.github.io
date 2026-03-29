/// <reference lib="webworker" />
/**
 * Web Worker entry point for offscreen shader rendering.
 *
 * Receives `postMessage` commands from the main thread (init, stop, pause,
 * resume, resize, darkmode, fpsLimit) and delegates to the lazily imported
 * WebGL or WebGPU driver. Init operations are serialized via a promise chain
 * to prevent concurrent render loops when rapid shader switches occur.
 */
import { type RenderProgramHandles, type RenderStrategy, RenderStrategyType } from "../types";

let programHandles: RenderProgramHandles | null = null;

// Serialize init operations: a second 'init' message must wait for the first to
// complete before starting. Without this, the async onmessage handler returns at
// the first await, the worker processes the next 'init' immediately, and both
// render loops run concurrently (causing two animations visible at once).
let initChain = Promise.resolve();
interface BackgroundOptions {
  canvas: OffscreenCanvas;
  strategy: RenderStrategy;
  height: number;
  width: number;
  shaderName: string;
  settings: Record<string, boolean>;
}

const shaderCache = new Map<string, string>();

/** Fetches and caches shader source files within the worker scope. */
const resolveShader = async (shaderName: string) => {
  // lazy create map
  if (shaderCache && shaderCache.has(shaderName)) {
    const cached = shaderCache.get(shaderName);

    if (cached) {
      return cached;
    }
  }

  const shaderSource = await fetch(`./shaders/${shaderName}`).then((x) => x.text());
  if (shaderSource) {
    // set the shaderName
    shaderCache.set(shaderName, shaderSource);
  }
  return shaderSource as string;
};

// Draw counter — reported to main thread periodically for FPS measurement
let drawCount = 0;
let fpsInterval: ReturnType<typeof setInterval> | null = null;

/** Starts a 500 ms interval that posts draw FPS back to the main thread. */
function startFpsReporting() {
  if (fpsInterval) return;
  let lastCount = 0;
  let lastTime = performance.now();
  fpsInterval = setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastTime;
    const fps = Math.round(((drawCount - lastCount) / elapsed) * 1000);
    lastCount = drawCount;
    lastTime = now;
    postMessage({ type: "drawFps", fps });
  }, 500);
}

function stopFpsReporting() {
  if (fpsInterval) {
    clearInterval(fpsInterval);
    fpsInterval = null;
  }
}

/** Initializes the correct driver (WebGL / WebGPU) for the given strategy and shader. */
const init = async (evt: BackgroundOptions) => {
  const canvas = evt.canvas as OffscreenCanvas;
  const renderStrategy = evt.strategy as RenderStrategy;

  const options = {
    canvas: canvas,
    navigator: navigator,
    height: evt.height,
    width: evt.width,
    settings: evt.settings,
    onDraw: () => {
      drawCount++;
    },
  } as const;

  const shaderName = evt.shaderName;

  switch (renderStrategy.type) {
    case RenderStrategyType.WebGL: {
      const shaderSource = await resolveShader(`${shaderName}.glsl`);
      return await import("./webgl.driver").then(async (x) =>
        x.webGL2Driver({
          ...options,
          shaderSource: shaderSource,
        }),
      );
    }
    case RenderStrategyType.WebGPU: {
      const shaderSource = await resolveShader(`${shaderName}.wgsl`);
      return await import("./webgpu.driver").then(async (x) =>
        x.webGPUDriver({
          ...options,
          shaderSource: shaderSource,
        }),
      );
    }
  }
};

onmessage = (evt) => {
  switch (evt.data.type) {
    case "init":
      // Chain onto the previous init so they never run concurrently.
      initChain = initChain.then(async () => {
        programHandles?.stop();
        drawCount = 0;
        programHandles = (await init(evt.data)) ?? null;
        startFpsReporting();
      });
      break;
    case "stop":
      programHandles?.stop();
      stopFpsReporting();
      break;
    case "resume":
      programHandles?.resume();
      break;
    case "pause":
      programHandles?.pause();
      break;
    case "resize":
      programHandles?.resize(evt.data.width, evt.data.height);
      break;
    case "darkmode":
      programHandles?.darkmode(evt.data.dark);
      break;
    case "fpsLimit":
      programHandles?.setFpsLimit(evt.data.fps);
      break;
  }
};

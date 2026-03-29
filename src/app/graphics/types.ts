export const enum RenderStrategyType {
  WebGL,
  WebGPU
}

export interface RenderStrategy {
  readonly type: RenderStrategyType,
  readonly offscreenRendering: boolean;
}

/** Control surface returned by a graphics driver to manage a running shader. */
export interface RenderProgramHandles {
  stop(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  darkmode(darkmode: number): void;
  setFpsLimit(fps: number): void;
}

/** Options passed to a graphics driver to initialize a shader program. */
export interface RenderProgramOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas,
  navigator: Navigator,
  width: number;
  height: number;

  // contains a webgpu shader or fragment shader in the case of webGL
  shaderSource: string;
  settings: Record<string, boolean | number>;

  // Called after each actual GPU draw — used for FPS measurement
  onDraw?: () => void;
}

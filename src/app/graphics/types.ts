export const enum RenderStrategyType {
  WebGL,
  WebGPU
}

export interface RenderStrategy {
  readonly type: RenderStrategyType,
  readonly offscreenRendering: boolean;
}

export interface RenderProgramHandles {
  stop(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number): void;
  darkmode(darkmode: number): void;
}

export interface RenderProgramOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas,
  navigator: Navigator,
  width: number;
  height: number;

  // contains a webgpu shader or fragment shader in the case of webGL
  shaderSource: string;
  settings: Record<string, boolean | number>
}

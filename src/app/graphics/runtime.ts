import { DOCUMENT } from "@angular/common";
import { inject, Injectable } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";

/**
 * Detects browser graphics capabilities and recommends a render strategy.
 *
 * Probes for WebGPU, WebGL 2, and OffscreenCanvas support at injection time.
 * The recommended strategy prefers WebGPU over WebGL and enables worker-based
 * offscreen rendering when the browser supports it.
 */
@Injectable({
  providedIn: 'root'
})
export class GraphicsRuntime {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly navigator = this.window?.navigator;

  /** Returns `true` if both `OffscreenCanvas` and Web Workers are available. */
  supportsOffscreen() {
    return this.window && 'OffscreenCanvas' in this.window && typeof this.window.Worker !== 'undefined';
  }

  /** Returns `true` if `navigator.gpu` is present. */
  supportsWebGPU() {
    return this.navigator && 'gpu' in this.navigator;
  }

  /**
   * Creates a throwaway canvas to probe for WebGL 2 support.
   * Immediately releases the context to avoid hitting the browser's context limit.
   */
  supportsWebGL() {
    if(!this.document) {
      return false;
    }

    const canvas = this.document.createElement("canvas");

    // Get WebGLRenderingContext from canvas element.
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    const supported = gl instanceof WebGLRenderingContext;

    // Release the context immediately to avoid hitting the browser's context limit
    if (supported) {
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }

    return supported;
  }

  /** Builds a {@link RenderStrategy} preferring WebGPU → WebGL, with offscreen if available. */
  getRecommendedRenderStrategy() {
    const type = this.detectBestRenderType();

    // Explicitly set offscreenRendering to false if the type is Image
    // const offscreenRendering = type === RenderStrategyType.Image ? false : this.supportsOffscreen();
    const offscreenRendering = this.supportsOffscreen();

    return {
      type: type,
      offscreenRendering: offscreenRendering
    } as RenderStrategy
  }

  /** Returns the best available API type, or `null` if neither is supported. */
  private detectBestRenderType() {
    // Check WebGPU support first, then WebGL, and finally fallback to Image
    if (this.supportsWebGPU()) {
      return RenderStrategyType.WebGPU;
    } else if (this.supportsWebGL()) {
      return RenderStrategyType.WebGL;
    } else {
      // Fallback if neither WebGPU nor WebGL is supported
      // return RenderStrategyType.Image;
      return null; 
    }
  }
}
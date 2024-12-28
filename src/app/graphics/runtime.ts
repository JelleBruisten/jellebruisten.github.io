import { DOCUMENT } from "@angular/common";
import { inject, Injectable } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";

/**
 * 
 */
@Injectable({
  providedIn: 'root'
})
export class GraphicsRuntime {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly navigator = this.window?.navigator;

  // Checks if both OffscreenCanvas and Web Workers are supported.
  supportsOffscreen() {
    return this.window && 'OffscreenCanvas' in this.window && typeof this.window.Worker !== 'undefined';
  }

  // Checks if WebGPU is supported.
  supportsWebGPU() {
    return this.navigator && 'gpu' in this.navigator;
  }

   // Checks if WebGL is supported.
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
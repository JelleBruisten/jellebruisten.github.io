/// <reference types="@webgpu/types" />

import { RenderProgramHandles, RenderProgramOptions } from "../types";
import { clamp } from "./clamp";
import { darkModeColor, lightModeColor } from "./constant";

/**
 * WebGPU driver — requests an adapter and device, creates a render pipeline
 * from the provided WGSL shader, and runs a `requestAnimationFrame` loop.
 * Uniforms (`iResolution`, `iTime`, `iDarkMode`) are written to a 16-byte
 * uniform buffer each frame. Returns `null` if the browser lacks WebGPU support.
 */
export async function webGPUDriver(
  options: RenderProgramOptions,
): Promise<RenderProgramHandles | null> {
  if (!options.navigator?.gpu) {
    return null;
  }

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.error("need a browser that supports WebGPU");
    return null;
  }

  const canvas = options.canvas;
  const context = options.canvas.getContext("webgpu");
  if (!context) {
    return null;
  }

  canvas.width = options.width ?? 300;
  canvas.height = options.height ?? 300;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: "Basic shader",
    code: options.shaderSource,
  });

  // Uniform setup
  const uniforms = {
    iResolution: [canvas.width, canvas.height],
    iTime: 0.0,
    iDarkMode: clamp(options.settings["dark"] as number, darkModeColor, lightModeColor),
  };

  // Create a uniform buffer
  const uniformBuffer = device.createBuffer({
    size: 16, // vec2 (8 bytes) + float (4 bytes) + float (4 bytes) darkmode
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create bind group layout and bind group
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    label: "Basic shader",
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      entryPoint: "vs",
      module,
    },
    fragment: {
      entryPoint: "fs",
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  const renderPassDescriptor = {
    label: "our basic canvas renderPass",
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.5, 0.5, 0.5, 1],
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ] as GPURenderPassColorAttachment[],
  } as const;

  // Update uniforms function
  const updateUniforms = (time: number) => {
    uniforms.iTime = time / 1000; // Convert time to seconds
    const uniformData = new Float32Array([
      uniforms.iResolution[0],
      uniforms.iResolution[1],
      uniforms.iTime,
      uniforms.iDarkMode,
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);
  };

  // Render loop
  let rafHandle: number | null = null;

  // control whether we are paused
  let paused = false;

  // time
  let accumulatedTime = 0;
  let lastRenderTime = 0; // Last frame's timestamp

  // Frame rate limiting: 0 = unlimited
  let minFrameTime = options.settings["fpsLimit"]
    ? 1000 / (options.settings["fpsLimit"] as number)
    : 0;

  const render = (timestamp: number) => {
    if (!lastRenderTime) {
      lastRenderTime = timestamp;
    }

    if (paused) {
      return; // Skip rendering while paused
    }

    // Frame rate limiting — skip draw but keep RAF running
    if (minFrameTime > 0 && timestamp - lastRenderTime < minFrameTime) {
      rafHandle = requestAnimationFrame(render);
      return;
    }

    const delta = timestamp - lastRenderTime; // Time since the last frame
    accumulatedTime += delta; // Add delta to accumulated time
    lastRenderTime = timestamp; // Update the last render time
    updateUniforms(accumulatedTime);

    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder({ label: "Render encoder" });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6);
    pass.end();

    const commandBuffer = encoder.finish();
    device?.queue?.submit([commandBuffer]);
    options.onDraw?.();
    rafHandle = requestAnimationFrame(render);
  };
  rafHandle = requestAnimationFrame(render);

  return {
    pause: () => {
      if (paused) return;

      paused = true;

      // cancel the AnimationFrame
      if (rafHandle) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    },
    resume: () => {
      if (!paused) return;

      paused = false;
      lastRenderTime = performance.now();

      // Restart the render loop
      rafHandle = requestAnimationFrame(render);
    },
    resize: (width, height) => {
      canvas.width = width;
      canvas.height = height;
      uniforms.iResolution = [canvas.width, canvas.height];
    },
    stop: () => {
      if (rafHandle) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }

      device.destroy();
      uniformBuffer.destroy();
    },
    darkmode: (dark) => {
      uniforms.iDarkMode = clamp(dark, darkModeColor, lightModeColor);
    },
    setFpsLimit: (fps) => {
      minFrameTime = fps > 0 ? 1000 / fps : 0;
    },
  } satisfies RenderProgramHandles;
}

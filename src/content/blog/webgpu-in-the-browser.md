---
title: "WebGPU in the Browser: A Practical Guide"
date: "2026-03-14"
description: "WebGPU is the successor to WebGL, bringing compute shaders and modern GPU APIs to the web. Here's how to set one up from scratch — no game engine required."
tags: ["webgpu", "graphics", "typescript"]
---

WebGPU has shipped in Chrome, Edge, and Safari (behind a flag in Firefox). It's not just a graphics API — it also exposes GPU compute, opening up machine learning inference, physics simulations, and real-time image processing directly in the browser. This site itself uses WebGPU (with a WebGL fallback) for its animated background.

## Why WebGPU over WebGL?

WebGL was designed in 2011, modelled after OpenGL ES 2.0. It's showing its age:

- **No compute shaders:** general-purpose GPU computation isn't possible
- **Stateful API:** global state makes it easy to introduce subtle bugs
- **Driver overhead:** each WebGL call crosses the browser/driver boundary individually

WebGPU fixes all three. It's modelled after Metal, Vulkan, and D3D12: explicit resource management, pipeline state objects, and full compute support.

## Checking for Support

WebGPU is available in Chrome 113+, Edge 113+, and Safari 18. Firefox supports it behind a flag but it's not enabled by default.

```typescript
async function supportsWebGPU(): Promise<boolean> {
  if (!navigator.gpu) return false;
  const adapter = await navigator.gpu.requestAdapter();
  return adapter !== null;
}
```

Always feature-detect. Provide a WebGL path as a fallback for browsers that don't support it yet.

## Bootstrapping a WebGPU Context

```typescript
const canvas = document.createElement("canvas");
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter!.requestDevice();
const context = canvas.getContext("webgpu")!;

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format, alphaMode: "premultiplied" });
```

`GPUDevice` is your main handle to the GPU. Everything — buffers, textures, pipelines — is created through it.

## Writing a Shader in WGSL

WebGPU uses WGSL (WebGPU Shading Language), a Rust-inspired language that's type-safe and explicitly structured:

```wgsl
struct Uniforms {
    resolution: vec2f,
    time:       f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    // Two triangles covering clip space (-1 to 1)
    let x = f32((idx & 1u) << 1u) - 1.0;
    let y = f32((idx & 2u)) - 1.0;
    return vec4f(x, y, 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let uv  = pos.xy / u.resolution;
    let col = vec3f(uv, 0.5 + 0.5 * sin(u.time));
    return vec4f(col, 1.0);
}
```

## Building a Render Pipeline

```typescript
const module = device.createShaderModule({ code: wgslSource });

const pipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: { module, entryPoint: "vs" },
  fragment: { module, entryPoint: "fs", targets: [{ format }] },
  primitive: { topology: "triangle-list" },
});
```

WebGPU pipelines are immutable objects compiled once and reused every frame, which is a major reason for its lower CPU overhead versus WebGL.

## Uniform Buffers and Bind Groups

Before rendering, create a buffer to hold the uniform data and a bind group that connects it to the pipeline:

```typescript
// 3 floats: width, height, time (padded to 16 bytes for alignment)
const uniformBuffer = device.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
});
```

`GPUBufferUsage.UNIFORM` marks it as a uniform buffer. `COPY_DST` allows writing to it from the CPU each frame via `device.queue.writeBuffer`. The bind group wires the buffer to binding slot 0 in the shader, matching the `@binding(0)` in the WGSL.

## The Render Loop

```typescript
function frame(time: number) {
  // Update uniform buffer
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    new Float32Array([canvas.width, canvas.height, time / 1000]),
  );

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(6); // two triangles = full-screen quad
  pass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

## Running in a Web Worker

For heavy shaders, you can hand the canvas off to a Web Worker via `OffscreenCanvas`. This moves all CPU-side GPU orchestration off the main thread:

```typescript
// main thread
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// worker
self.onmessage = async ({ data }) => {
  const context = data.canvas.getContext("webgpu");
  // ... same setup as above
};
```

This pattern prevents your shader from causing dropped frames on the main thread, even if a single frame takes longer than 16 ms.

## Compute Shaders

This is where WebGPU really shines. A compute shader runs arbitrary work on the GPU:

```wgsl
@group(0) @binding(0) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    output[id.x] = f32(id.x) * f32(id.x);
}
```

Dispatch it from JavaScript and read the results back:

```typescript
const computePipeline = device.createComputePipeline({
  layout: "auto",
  compute: { module: device.createShaderModule({ code: computeWgsl }), entryPoint: "main" },
});

const encoder = device.createCommandEncoder();
const pass = encoder.beginComputePass();
pass.setPipeline(computePipeline);
pass.setBindGroup(0, bindGroup);
pass.dispatchWorkgroups(Math.ceil(dataLength / 64));
pass.end();
device.queue.submit([encoder.finish()]);
```

Reading results back requires a staging buffer with `MAP_READ` usage and an `await buffer.mapAsync(GPUMapMode.READ)` call. This pattern is perfect for image processing, physics, or on-device ML inference.

## Conclusion

WebGPU is genuinely exciting. It's the first web graphics API that feels like it was designed for the modern GPU programming model rather than bolted on top of legacy OpenGL. The WGSL language is stricter than GLSL but pays off in fewer mysterious driver bugs. If you're building anything graphics-intensive on the web, WebGPU is worth learning now — the gap between desktop GPU capability and what the browser exposes is finally closing.

If you want to see these concepts applied in a real project, the [next post](/blog/shader-background-system) covers how this site's animated background system is built — dual WebGL/WebGPU support, Web Worker offloading, dark mode as a shader uniform, and a tour of the shaders themselves.

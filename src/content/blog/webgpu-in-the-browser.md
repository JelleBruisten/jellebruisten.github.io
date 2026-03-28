---
title: "WebGPU in the Browser: A Practical Guide"
date: "2026-02-10"
description: "WebGPU is the successor to WebGL, bringing compute shaders and modern GPU APIs to the web. Here's how to set one up from scratch — no game engine required."
tags: ["webgpu", "graphics", "typescript"]
---

# WebGPU in the Browser: A Practical Guide

WebGPU has shipped in Chrome, Edge, and Safari (behind a flag in Firefox). It's not just a graphics API — it also exposes GPU compute, opening up machine learning inference, physics simulations, and real-time image processing directly in the browser. This site itself uses WebGPU (with a WebGL fallback) for its animated background.

## Why WebGPU over WebGL?

WebGL was designed in 2011, modelled after OpenGL ES 2.0. It's showing its age:

- **No compute shaders** — general-purpose GPU computation isn't possible
- **Stateful API** — global state makes it easy to introduce subtle bugs
- **Driver overhead** — each WebGL call crosses the browser ↔ driver boundary

WebGPU fixes all three. It's modelled after Metal, Vulkan, and D3D12: explicit resource management, pipeline state objects, and full compute support.

## Checking for Support

```typescript
async function supportsWebGPU(): Promise<boolean> {
  if (!navigator.gpu) return false;
  const adapter = await navigator.gpu.requestAdapter();
  return adapter !== null;
}
```

Always feature-detect — WebGPU isn't universally available yet. Provide a WebGL path as a fallback.

## Bootstrapping a WebGPU Context

```typescript
const canvas  = document.createElement('canvas');
const adapter = await navigator.gpu.requestAdapter();
const device  = await adapter!.requestDevice();
const context = canvas.getContext('webgpu')!;

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format, alphaMode: 'premultiplied' });
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
    // Full-screen triangle trick
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
  layout: 'auto',
  vertex:   { module, entryPoint: 'vs' },
  fragment: { module, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' },
});
```

WebGPU pipelines are immutable objects compiled once and reused every frame — a major reason for its lower CPU overhead versus WebGL.

## The Render Loop

```typescript
function frame(time: number) {
    // Update uniform buffer
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
      canvas.width, canvas.height, time / 1000
    ]));

    const encoder = device.createCommandEncoder();
    const pass    = encoder.beginRenderPass({
        colorAttachments: [{
            view:       context.getCurrentTexture().createView(),
            loadOp:     'clear',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp:    'store',
        }]
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

For heavy shaders, you can hand the canvas off to a Web Worker via `OffscreenCanvas`. This moves all GPU work off the main thread:

```typescript
// main thread
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// worker
self.onmessage = async ({ data }) => {
    const context = data.canvas.getContext('webgpu');
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

Dispatch it from JavaScript, read the results back — perfect for image processing, physics, or on-device ML inference.

## Conclusion

WebGPU is genuinely exciting. It's the first web graphics API that feels like it was designed for the modern GPU programming model rather than bolted on top of legacy OpenGL. The WGSL language is stricter than GLSL but pays off in fewer mysterious driver bugs. If you're building anything graphics-intensive on the web, WebGPU is worth learning now — the gap between desktop GPU capability and what the browser exposes is finally closing.

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f( -1.0,  -1.0),
    vec2f(1.0, -1.0),
    vec2f( -1.0, 1.0),

    vec2f( -1.0,  1.0),
    vec2f(1.0, -1.0),
    vec2f( 1.0, 1.0)
  );

  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

// Uniform Structure
struct Uniforms {
    iResolution: vec2f, // Screen resolution
    iTime: f32,         // Time
    iDarkmode: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash33(p: vec3<f32>) -> vec3<f32> {
    let q = vec3<f32>(
        dot(p, vec3<f32>(127.1, 311.7, 74.7)),
        dot(p, vec3<f32>(269.5, 183.3, 246.1)),
        dot(p, vec3<f32>(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(q) * 43758.5453123);
}

const SPEED: f32 = 0.010;

fn tetraNoise(o: vec2<f32>) -> f32 {
    let t = uniforms.iTime * SPEED;
    let p = vec3<f32>(o.x + 2.0 * t, o.y + t, 1.25 * t);
    let i = floor(p + dot(p, vec3<f32>(0.33333)));
    let x = p - i + dot(i, vec3<f32>(0.16666));
    let i1 = step(x.yzx, x);
    let i2 = max(i1, 1.0 - i1.zxy);
    let i1_min = min(i1, 1.0 - i1.zxy);

    let p1 = x - i1_min + 0.16666;
    let p2 = x - i2 + 0.33333;
    let p3 = x - 0.5;

    let v = max(
      vec4<f32>(0.5) - vec4<f32>(dot(x, x), dot(p1, p1), dot(p2, p2), dot(p3, p3)),
      vec4<f32>(0.0)
    );
    let d = vec4<f32>(
        dot(x, hash33(i)),
        dot(p1, hash33(i + i1_min)),
        dot(p2, hash33(i + i2)),
        dot(p3, hash33(i + vec3<f32>(1.0)))
    );

    let n = clamp(dot(d, v * v * v * 8.0) * 1.732 + 0.5, 0.0, 1.0);
    return n;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = vec2f(fragCoord.xy);
    // Flip the Y coordinate
    let flippedUV = vec2f(uv.x, uniforms.iResolution.y - uv.y);
    let p = (flippedUV - uniforms.iResolution.xy * 0.5) / uniforms.iResolution.y * 2.0;

    let f = sin(32.0 * tetraNoise(p));
    let weight = clamp(1.5 - 0.5 * abs(f) / fwidth(f), 0.0, 1.0);

    let darkness  = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let bgDark    = vec3f(0.01,  0.02,  0.06);
    let bgLight   = vec3f(0.93,  0.94,  0.96);
    let lineDark  = vec3f(0.35,  0.45,  0.72);
    let lineLight = vec3f(0.48,  0.52,  0.68);
    let bg   = mix(bgLight,   bgDark,   darkness);
    let line = mix(lineLight, lineDark, darkness);
    return vec4f(mix(bg, line, weight), 1.0);
}

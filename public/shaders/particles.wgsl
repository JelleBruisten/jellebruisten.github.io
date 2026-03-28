@vertex fn vs(
  @builtin(vertex_index) vertexIndex: u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

struct Uniforms {
    iResolution: vec2f,
    iTime: f32,
    iDarkmode: f32,
    iMouse: vec2f
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x  *= ar;

    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let bgDark   = vec3f(0.02, 0.03, 0.08);
    let bgLight  = vec3f(0.92, 0.94, 0.97);
    let inkDark  = vec3f(0.45, 0.68, 1.00);
    let inkLight = vec3f(0.18, 0.35, 0.75);
    let bg       = mix(bgLight, bgDark, darkness);
    let ink      = mix(inkLight, inkDark, darkness);

    let N    = select(18, 36, uniforms.iResolution.x >= 768.0);
    let CONN = 0.28f;

    var p: array<vec2f, 36>;
    for (var i = 0; i < N; i++) {
        let f   = f32(i);
        let ox  = (hash(f * 1.73) - 0.5) * ar;
        let oy  =  hash(f * 2.31) - 0.5;
        let amp = 0.08 + hash(f * 3.97) * 0.06;
        let ph  = hash(f * 5.11) * 6.2832;
        let spd = 0.12 + hash(f * 6.83) * 0.10;
        p[i] = vec2f(
            ox + amp        * cos(uniforms.iTime * spd + ph),
            oy + amp * 0.75 * sin(uniforms.iTime * spd * 0.8 + ph + 1.3)
        );
    }

    var acc: f32 = 0.0;

    // Connecting lines
    for (var i = 0; i < N; i++) {
        for (var j = i + 1; j < N; j++) {
            let d = length(p[i] - p[j]);
            if (d < CONN) {
                let ab   = p[j] - p[i];
                let t    = clamp(dot(uv - p[i], ab) / dot(ab, ab), 0.0, 1.0);
                let dist = length(uv - (p[i] + ab * t));
                acc = max(acc, smoothstep(0.0025, 0.0, dist) * (1.0 - d / CONN) * 0.60);
            }
        }
    }

    // Dots + soft glow
    for (var i = 0; i < N; i++) {
        let d = length(uv - p[i]);
        acc = max(acc, smoothstep(0.009, 0.001, d));
        acc = max(acc, smoothstep(0.035, 0.0,   d) * 0.20);
    }

    return vec4f(mix(bg, ink, clamp(acc, 0.0, 1.0)), 1.0);
}

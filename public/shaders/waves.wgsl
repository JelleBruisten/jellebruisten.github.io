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
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x  *= ar;

    let darkness    = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let bgDark      = vec3f(0.02, 0.04, 0.12);
    let bgLight     = vec3f(0.90, 0.93, 0.98);
    let peakDark    = vec3f(0.05, 0.65, 0.90);
    let troughDark  = vec3f(0.40, 0.08, 0.75);
    let peakLight   = vec3f(0.15, 0.45, 0.85);
    let troughLight = vec3f(0.60, 0.30, 0.82);
    let bg          = mix(bgLight, bgDark, darkness);
    let peak        = mix(peakLight,   peakDark,   darkness);
    let trough      = mix(troughLight, troughDark, darkness);

    let NS = 6;
    var wave: f32 = 0.0;
    for (var i = 0; i < NS; i++) {
        let f    = f32(i);
        let sx   = (hash(f * 1.31) - 0.5) * ar * 0.9;
        let sy   = (hash(f * 2.71) - 0.5) * 0.8;
        let dspd = 0.04 + hash(f * 3.17) * 0.03;
        let src  = vec2f(
            sx + 0.15 * cos(uniforms.iTime * dspd + f * 1.1),
            sy + 0.10 * sin(uniforms.iTime * dspd * 0.9 + f * 2.3)
        );
        let dist  = length(uv - src);
        let freq  = 14.0 + hash(f * 4.53) * 6.0;
        let wspd  = 1.8  + hash(f * 6.37) * 0.8;
        let phase = hash(f * 5.91) * 6.2832;
        wave += sin(dist * freq - uniforms.iTime * wspd + phase);
    }
    wave /= f32(NS);

    let t = wave * 0.5 + 0.5;

    var col: vec3f;
    if (t < 0.5) {
        col = mix(trough, bg, t * 2.0);
    } else {
        col = mix(bg, peak, (t - 0.5) * 2.0);
    }

    return vec4f(col, 1.0);
}

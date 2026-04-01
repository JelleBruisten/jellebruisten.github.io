@vertex fn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let pos = array(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0,  1.0), vec2f(1.0, -1.0), vec2f( 1.0, 1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

struct Uniforms {
  iResolution: vec2f,
  iTime: f32,
  iDarkmode: f32,
  iQuality: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    // Warm dark background
    let bg = mix(vec3f(0.18, 0.12, 0.08), vec3f(0.03, 0.02, 0.01), dark);
    var col = bg;

    let qScale = mix(0.35, 1.0, u.iQuality);
    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.03 * qScale), 5, 40);
    let t = u.iTime;

    for (var i = 0; i < 50; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);
        let h5 = hash(fi + 311.9);

        // Slow drift — lights float gently upward
        let speed = 0.005 + h2 * 0.012;
        let pad = 0.15;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.03 * sin(t * 0.2 + fi * 1.7);
        // Rise upward in WebGPU (y decreases)
        let y = (1.0 + pad) - fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);
        let d = length(diff);

        // Twinkle: pulsing brightness per light
        let twinkle = 0.5 + 0.5 * sin(t * (1.5 + h4 * 3.0) + fi * 4.7);
        let brightness = 0.4 + twinkle * 0.6;

        // Two layers: sharp bright core + wide soft glow halo
        let coreSize = 0.004 + h3 * 0.004;
        let haloSize = 0.02 + h3 * 0.03;

        let core = exp(-d * d / (coreSize * coreSize)) * brightness;
        let halo = exp(-d * d / (haloSize * haloSize)) * brightness * 0.35;

        // Warm golden color palette with slight variation per light
        let warmth = h5 * 0.3;
        let lightCol = vec3f(
            1.0,
            0.7 - warmth * 0.15,
            0.2 - warmth * 0.15
        );

        // In light mode use mix blending; in dark mode additive looks better
        let glow = lightCol * (core + halo);
        col += glow * mix(0.6, 1.0, dark);
    }

    // Subtle warm ambient glow from bottom (like ground lights)
    let groundGlow = exp(-(1.0 - uv.y) * 3.0) * 0.06 * dark;
    col += vec3f(1.0, 0.6, 0.15) * groundGlow;

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

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
    iQuality: f32,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x *= ar;

    let t        = uniforms.iTime * 3.0;
    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let N = i32(mix(12.0, 32.0, uniforms.iQuality));
    var darkGlow   = vec3f(0.0);
    // Light: track the dominant (closest) blob per pixel for clear spatial structure
    var lightBest  = 0.0;
    var lightColor = vec3f(0.5);

    for (var i = 0; i < N; i++) {
        let fi  = f32(i);
        let bx  = (hash(fi * 1.73) - 0.5) * ar;
        let by  = hash(fi * 2.91) - 0.5;
        let spd = 0.045 + hash(fi * 3.17) * 0.065;
        let ph  = hash(fi * 5.31) * 6.2832;
        let pos = vec2f(
            bx + 0.16 * sin(t * spd + ph) + 0.06 * sin(t * spd * 2.1 + ph * 1.7),
            by + 0.12 * cos(t * spd * 0.75 + ph + 1.3) + 0.04 * cos(t * spd * 1.9 + ph)
        );

        let szSeed = hash(fi * 7.11);
        let sz = 0.05 + szSeed * szSeed * 0.22;
        let d  = length(uv - pos);
        let g  = exp(-d * d / (sz * sz));

        let hue = hash(fi * 4.37);
        // Dark palette: vibrant blue / teal / purple
        var cd: vec3f;
        if (hue < 0.33) {
            cd = mix(vec3f(0.15, 0.45, 1.00), vec3f(0.00, 0.80, 0.90), hue * 3.0);
        } else if (hue < 0.66) {
            cd = mix(vec3f(0.55, 0.15, 0.95), vec3f(0.15, 0.45, 1.00), (hue - 0.33) * 3.0);
        } else {
            cd = mix(vec3f(0.85, 0.92, 1.00), vec3f(0.55, 0.15, 0.95), (hue - 0.66) * 3.0);
        }
        // Light palette: darker blobs on near-white canvas
        var cl: vec3f;
        if (hue < 0.33) {
            cl = mix(vec3f(0.18, 0.32, 0.72), vec3f(0.20, 0.54, 0.50), hue * 3.0);
        } else if (hue < 0.66) {
            cl = mix(vec3f(0.36, 0.20, 0.66), vec3f(0.18, 0.32, 0.72), (hue - 0.33) * 3.0);
        } else {
            cl = mix(vec3f(0.24, 0.50, 0.62), vec3f(0.36, 0.20, 0.66), (hue - 0.66) * 3.0);
        }

        let pulse = 0.75 + 0.25 * sin(t * (0.15 + hash(fi * 2.13) * 0.25) + ph);

        darkGlow += cd * g * pulse;

        // For light mode: keep only the strongest blob contribution at this pixel
        let contrib = g * pulse;
        if (contrib > lightBest) {
            lightBest  = contrib;
            lightColor = cl;
        }
    }

    let bgDark  = vec3f(0.01, 0.02, 0.06);
    let bgLight = vec3f(0.95, 0.96, 0.99);

    let darkResult  = clamp(bgDark + darkGlow * 0.65, vec3f(0.0), vec3f(1.0));
    // Blend toward the dominant blob color — up to 88% at blob centers
    let lightResult = mix(bgLight, lightColor, clamp(lightBest * 0.94, 0.0, 0.94));

    let col = mix(lightResult, darkResult, darkness);
    return vec4f(col, 1.0);
}

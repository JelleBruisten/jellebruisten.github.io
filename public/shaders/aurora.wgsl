@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0)
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

// Robust hash — stable at any input magnitude (no sin precision issues)
fn hash2(p: vec2f) -> f32 {
    let q = fract(p * vec2f(0.1031, 0.1030));
    let r = q + dot(q, q.yx + 33.33);
    return fract((r.x + r.y) * r.x);
}

fn smoothNoise1d(x: f32) -> f32 {
    let i = floor(x);
    let f = fract(x);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(hash2(vec2f(i, 0.0)), hash2(vec2f(i + 1.0, 0.0)), u);
}

fn noise2d(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i + vec2f(0.0, 0.0)), hash2(i + vec2f(1.0, 0.0)), u.x),
        mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
        u.y
    );
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let res = uniforms.iResolution;
    let t   = uniforms.iTime;
    let dark = uniforms.iDarkmode;

    // uv in [0,1], y upward
    let uv = vec2f(fragCoord.x / res.x, 1.0 - fragCoord.y / res.y);

    let mouseShift = 0.0;

    // darkness: 1 = dark mode (iDarkmode≈0.2), 0 = light mode (iDarkmode≈1.0)
    let darkness = clamp(1.0 - (dark - 0.2) / 0.8, 0.0, 1.0);

    // Sky background
    let bgDark  = vec3f(0.010, 0.014, 0.055);
    let bgLight = vec3f(0.930, 0.935, 0.975);
    let bg = mix(bgLight, bgDark, darkness);

    var col = bg;

    // Six aurora curtains
    for (var i: i32 = 0; i < 6; i++) {
        let fi = f32(i);

        let tScale = 0.09 + fi * 0.025;
        let waveX  = uv.x * (1.1 + fi * 0.28);

        let n1 = noise2d(vec2f(waveX       + t * tScale,        fi * 3.71));
        let n2 = noise2d(vec2f(waveX * 0.6 - t * tScale * 0.75 + fi * 1.3, fi * 2.13 + 5.0));
        let wave = (n1 * 0.72 + n2 * 0.28) * 0.15 - 0.075;

        // Band centre rises from ~0.28 to ~0.68 across the six bands
        let centre = 0.28 + (fi / 5.0) * 0.40 + wave + mouseShift;
        let dist   = uv.y - centre;

        // Asymmetric curtain glow
        let glowUp   = exp(-max( dist, 0.0) * 20.0);
        let glowDown = exp(-max(-dist, 0.0) *  9.0);
        let intensity = glowUp * glowDown;

        // Subtle flicker per band
        let flicker = 0.82 + 0.18 * sin(t * 1.9 + fi * 2.4 + n1 * 2.8);

        let tBand = fi / 5.0;

        // Dark mode: vivid blue → violet, added onto dark background
        let bandDark = mix(vec3f(0.05, 0.55, 1.00), vec3f(0.60, 0.10, 1.00), tBand);
        let teal = vec3f(0.00, 0.82, 0.72)
            * smoothNoise1d(uv.x * 3.2 + fi + t * 0.18)
            * 0.20;
        col += (bandDark + teal) * intensity * flicker * 0.45 * darkness;

        // Light mode: vivid blue → violet/rose blended onto light bg
        let bandLight = mix(vec3f(0.38, 0.58, 0.95), vec3f(0.82, 0.42, 0.88), tBand);
        col = mix(col, bandLight, intensity * flicker * 0.90 * (1.0 - darkness));
    }

    // Point stars — each grid cell gets a random sub-cell position
    let starsUV  = uv * vec2f(res.x / res.y, 1.0) * 80.0;
    let starCell = floor(starsUV);
    let starFrac = fract(starsUV) - 0.5;
    let starH    = hash2(starCell);
    let starPos  = vec2f(hash2(starCell + vec2f(13.7, 31.1)) - 0.5,
                         hash2(starCell + vec2f(47.3, 21.9)) - 0.5) * 0.7;
    let starDist = length(starFrac - starPos);
    let starBright = step(0.978, starH) * smoothstep(0.05, 0.0, starDist) * darkness * 0.75;
    col += vec3f(starBright);

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

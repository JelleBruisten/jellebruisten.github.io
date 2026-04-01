@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
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

fn hash2(p: vec2f) -> f32 {
    let q = fract(p * vec2f(0.1031, 0.1030));
    let r = q + dot(q, q.yx + 33.33);
    return fract((r.x + r.y) * r.x);
}

fn noise2d(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i),                  hash2(i + vec2f(1.0, 0.0)), u.x),
        mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
        u.y
    );
}

// 3-octave fractional Brownian motion — organic multi-scale structure
fn fbm(p: vec2f) -> f32 {
    var v  = 0.0;
    var a  = 0.5;
    var pp = p;
    for (var i: i32 = 0; i < 3; i++) {
        v  += a * noise2d(pp);
        pp  = pp * 2.07 + vec2f(5.37, 1.92);
        a  *= 0.5;
    }
    return v; // roughly [0, 1]
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let res  = uniforms.iResolution;
    let t    = uniforms.iTime * 0.50;
    let dark = uniforms.iDarkmode;

    // uv in [0,1], y upward
    let uv = vec2f(fragCoord.x / res.x, 1.0 - fragCoord.y / res.y);

    // darkness: 1 = dark mode (iDarkmode≈0.2), 0 = light mode (iDarkmode≈1.0)
    let darkness = clamp(1.0 - (dark - 0.2) / 0.8, 0.0, 1.0);

    // Sky gradient — dark is pure deep navy so aurora colors stand out
    let skyDark  = mix(vec3f(0.008, 0.014, 0.055), vec3f(0.002, 0.004, 0.022), uv.y);
    let skyLight = mix(vec3f(0.940, 0.948, 0.995), vec3f(0.740, 0.830, 0.975), uv.y);
    var col = mix(skyLight, skyDark, darkness);

    // ── Aurora ribbons (2–5 depending on quality) ─────────────────────────────
    let RIBBONS = i32(mix(2.0, 5.0, uniforms.iQuality));
    for (var i: i32 = 0; i < RIBBONS; i++) {
        let fi   = f32(i);
        let seed = fi * 6.17;

        let drift = t * (0.14 + fi * 0.030);

        // Domain warp: FBM displaces X → vertical striations (real aurora curtains)
        let warpX  = uv.x * 2.0 + drift + seed;
        let warp   = (fbm(vec2f(warpX, fi * 2.13 + t * 0.30)) - 0.5) * 0.16;

        // Ribbon baseline height — FBM undulation
        let hX     = uv.x * 1.3 + drift * 0.55 + seed * 1.5;
        let height = fbm(vec2f(hX, t * 0.20 + fi * 1.63));
        let ribbonY = 0.34 + (fi / 4.0) * 0.44 + (height * 0.22 - 0.11);

        let dist = uv.y - (ribbonY + warp);

        // Light mode slightly wider than dark, but not so wide ribbons merge into one blob
        let fallUp   = mix(26.0, 38.0, darkness);
        let fallDown = mix(15.0, 20.0, darkness);
        let glowUp   = exp(-max( dist, 0.0) * fallUp);
        let glowDown = exp(-max(-dist, 0.0) * fallDown);
        let rawGlow  = glowUp * glowDown;

        let shimmer = 0.72 + 0.28 * noise2d(vec2f(uv.x * 9.0 + fi * 3.7, t * 4.0 + fi));

        let striX  = uv.x * 16.0 + warp * 14.0 + fi * 2.9;
        let stria  = 0.55 + 0.45 * noise2d(vec2f(striX, t * 0.7 + fi * 0.9));

        let intensity  = rawGlow * shimmer * stria;
        let lightAlpha = rawGlow * (0.82 + 0.18 * shimmer) * 0.94 * (1.0 - darkness);

        let yPos  = clamp((-dist + 0.10) / 0.20, 0.0, 1.0);
        let tBand = fi / 4.0;

        // ── Dark mode: bright greens → blue/violet, punchy against deep navy ──
        let coreD  = mix(vec3f(0.05, 1.00, 0.50), vec3f(0.00, 0.88, 0.80), tBand);
        let topD   = mix(vec3f(0.20, 0.55, 1.00), vec3f(0.60, 0.08, 0.95), tBand);
        let bandD  = mix(coreD, topD, yPos * yPos);

        // ── Light mode: vivid saturated hues ──
        let coreL  = mix(vec3f(0.00, 0.65, 0.60), vec3f(0.45, 0.00, 0.86), tBand);
        let topL   = mix(vec3f(0.05, 0.25, 0.98), vec3f(0.90, 0.04, 0.68), tBand);
        let bandL  = mix(coreL, topL, yPos * yPos);

        col += bandD * intensity * 0.75 * darkness;
        col  = mix(col, bandL, lightAlpha);
    }

    // ── Atmospheric horizon glow (dark mode only) ───────────────────────────
    let horizonGlow = exp(-uv.y * 5.5) * 0.10 * darkness;
    col += vec3f(0.00, 0.22, 0.30) * horizonGlow;

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

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

// Smooth 3-stop palette: blue → teal → purple
fn cellDarkPalette(t: f32) -> vec3f {
    let a = vec3f(0.04, 0.06, 0.22);
    let b = vec3f(0.03, 0.14, 0.20);
    let c = vec3f(0.10, 0.04, 0.26);
    let t1 = clamp(t * 2.0, 0.0, 1.0);
    let t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

fn borderDarkPalette(t: f32) -> vec3f {
    let a = vec3f(0.20, 0.55, 1.00); // blue
    let b = vec3f(0.00, 0.88, 0.78); // teal
    let c = vec3f(0.60, 0.15, 0.92); // purple
    let t1 = clamp(t * 2.0, 0.0, 1.0);
    let t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

fn cellLightPalette(t: f32) -> vec3f {
    let a = vec3f(0.89, 0.94, 0.99); // sky blue
    let b = vec3f(0.88, 0.97, 0.96); // mint
    let c = vec3f(0.94, 0.90, 0.99); // lavender
    let t1 = clamp(t * 2.0, 0.0, 1.0);
    let t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

fn borderLightPalette(t: f32) -> vec3f {
    let a = vec3f(0.25, 0.48, 0.88); // blue
    let b = vec3f(0.08, 0.68, 0.62); // teal
    let c = vec3f(0.55, 0.22, 0.82); // purple
    let t1 = clamp(t * 2.0, 0.0, 1.0);
    let t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x  *= ar;

    let t        = uniforms.iTime;
    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let NS = 48;
    var d1: f32 = 1e5;
    var d2: f32 = 1e5;
    var id: i32 = 0;

    for (var i = 0; i < NS; i++) {
        let f   = f32(i);
        let ox  = (hash(f * 1.73) - 0.5) * ar;
        let oy  =  hash(f * 2.31) - 0.5;
        let spd = 0.025 + hash(f * 3.97) * 0.02;
        let ph  = hash(f * 5.11) * 6.2832;
        let seed = vec2f(
            ox + 0.12 * cos(t * spd + ph),
            oy + 0.09 * sin(t * spd * 0.8 + ph + 1.1)
        );
        let d = length(uv - seed);
        if (d < d1) { d2 = d1; d1 = d; id = i; }
        else if (d < d2) { d2 = d; }
    }

    let borderDist = d2 - d1;
    let hue   = hash(f32(id) * 7.13);
    let pulse = 0.84 + 0.16 * sin(t * (0.4 + hash(f32(id) * 2.7) * 0.5) + hue * 6.28);

    // Interior gradient: subtle centre highlight
    let interior = 1.0 - smoothstep(0.0, 0.28, d1);

    // ── Dark mode ────────────────────────────────────────────────────────────
    let cellD   = cellDarkPalette(hue)   + cellDarkPalette(hue) * interior * 0.5;
    let borderD = borderDarkPalette(hue) * (0.9 + 0.1 * pulse);

    let edgeLine = 1.0 - smoothstep(0.0, 0.012, borderDist);
    let edgeGlow = exp(-borderDist * 28.0);

    var colDark = cellD * pulse;
    colDark += borderD * edgeLine * 1.2;
    colDark += borderD * edgeGlow * 0.35;

    // ── Light mode ───────────────────────────────────────────────────────────
    let cellL   = cellLightPalette(hue);                 // flat cell — no interior bleed
    let borderL = borderLightPalette(hue) * 0.85;        // slightly darker for contrast
    let edgeAlpha = smoothstep(0.007, 0.0, borderDist);  // tight ~7px border

    var colLight = cellL;
    colLight = mix(colLight, borderL, edgeAlpha);

    let col = mix(colLight, colDark, darkness);
    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

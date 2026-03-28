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

fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

// Returns xy=local position in hex cell, zw=cell grid id
fn hexGrid(p: vec2f) -> vec4f {
    let s  = vec2f(1.0, 1.7320508);
    let ss = vec4f(s, s);
    let hC = floor(vec4f(p, p - vec2f(0.5, 1.0)) / ss) + 0.5;
    let h  = vec4f(p - hC.xy * s, p - (hC.zw + 0.5) * s);
    if (dot(h.xy, h.xy) < dot(h.zw, h.zw)) {
        return vec4f(h.xy, hC.xy);
    }
    return vec4f(h.zw, hC.zw + 0.5);
}

// Distance from cell center; 0.5 at the hex boundary
fn hexDist(p: vec2f) -> f32 {
    let q = abs(p);
    return max(dot(q, normalize(vec2f(1.0, 1.7320508))), q.x);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    uv.x  *= uniforms.iResolution.x / uniforms.iResolution.y;

    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let scale = 8.0;
    let hx    = hexGrid(uv * scale);
    let local = hx.xy;
    let id    = hx.zw;

    let h = hash(id);
    let d = hexDist(local); // 0 at center, 0.5 at edge

    // Per-cell independent appear/disappear cycle
    let period  = 10.0 + hash(id * 3.17) * 10.0; // 10–20 s per cell
    let phase   = hash(id * 7.43) * 6.2832;
    let cycleT  = sin(uniforms.iTime * 6.2832 / period + phase);
    let visible = smoothstep(-0.3, 0.7, cycleT); // ~65% of the time visible

    // Iris-open: hex radius grows from 0 → 0.48 as visible goes 0 → 1
    let hexR = visible * 0.48;
    let aa   = max(fwidth(d), 0.004);
    let fill = 1.0 - smoothstep(hexR, hexR + aa, d);

    // Secondary brightness wave drifting across the grid
    let dist       = length(id * vec2f(1.0, 0.57735));
    let wave       = sin(uniforms.iTime * 0.6 - dist * 1.2 + phase) * 0.5 + 0.5;
    let brightness = 0.70 + wave * 0.30;

    // Glowing border — only once cell is >80% open
    let borderT = smoothstep(0.42, 0.50, d) * smoothstep(0.75, 0.95, visible);

    let cellDark    = mix(vec3f(0.05, 0.09, 0.22), vec3f(0.09, 0.04, 0.26), h);
    let borderDark  = mix(vec3f(0.25, 0.55, 1.00), vec3f(0.55, 0.20, 0.95), h);
    let cellLight   = mix(vec3f(0.84, 0.90, 0.97), vec3f(0.90, 0.84, 0.97), h);
    let borderLight = mix(vec3f(0.35, 0.50, 0.88), vec3f(0.60, 0.30, 0.85), h);
    let bgDark      = vec3f(0.01, 0.02, 0.06);
    let bgLight     = vec3f(0.90, 0.92, 0.97);

    let cell   = mix(cellLight,   cellDark,   darkness) * brightness;
    let border = mix(borderLight, borderDark, darkness);
    let bg     = mix(bgLight,     bgDark,     darkness);

    let hexCol = mix(cell, border, borderT);
    let col    = mix(bg, hexCol, fill);

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

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
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453);
}

fn dot2(v: vec2f) -> f32 { return dot(v, v); }

// Heart SDF by Inigo Quilez
fn sdHeart(ip: vec2f) -> f32 {
    var p = vec2f(abs(ip.x), ip.y);
    if (p.y + p.x > 1.0) {
        return sqrt(dot2(p - vec2f(0.25, 0.75))) - sqrt(2.0) / 4.0;
    }
    return sqrt(min(
        dot2(p - vec2f(0.0, 1.0)),
        dot2(p - 0.5 * max(p.x + p.y, 0.0))
    )) * sign(p.x - p.y);
}

fn rot2(a: f32) -> mat2x2f {
    let c = cos(a);
    let s = sin(a);
    return mat2x2f(c, s, -s, c);
}

// Shamrock: 3 heart leaves at 120° intervals + a stem
fn sdShamrock(p: vec2f) -> f32 {
    // Scale heart leaves smaller and offset outward from center
    let leafScale = 0.55;
    let leafOffset = 0.18;

    // Top leaf (pointing up)
    let p0 = (p - vec2f(0.0, -leafOffset)) / leafScale;
    let d0 = sdHeart(vec2f(p0.x, -p0.y + 0.5)) * leafScale;

    // Bottom-left leaf (rotated 120°)
    let r1 = rot2(2.094);
    let p1 = (r1 * p - vec2f(0.0, -leafOffset)) / leafScale;
    let d1 = sdHeart(vec2f(p1.x, -p1.y + 0.5)) * leafScale;

    // Bottom-right leaf (rotated 240°)
    let r2 = rot2(4.189);
    let p2 = (r2 * p - vec2f(0.0, -leafOffset)) / leafScale;
    let d2 = sdHeart(vec2f(p2.x, -p2.y + 0.5)) * leafScale;

    // Stem: thin rectangle going down
    let stemP = p - vec2f(0.0, 0.35);
    let stem = max(abs(stemP.x) - 0.04, abs(stemP.y) - 0.3);

    return min(min(min(d0, d1), d2), stem);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.90, 0.95, 0.90), vec3f(0.02, 0.06, 0.03), dark);
    var col = bg;

    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.02), 5, 35);
    let t = u.iTime;

    for (var i = 0; i < 40; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);

        let speed = 0.015 + h2 * 0.03;
        let size = 0.035 + h3 * 0.035;

        let pad = 0.08;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.03 * sin(t * 0.35 + fi * 1.9);
        // Float upward: y decreases in WebGPU (y=0 top)
        let y = (1.0 + pad) - fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 6.0) { continue; }

        // Slight rotation per clover
        let angle = h4 * 0.5 - 0.25 + sin(t * 0.3 + fi * 2.0) * 0.1;
        let ca = cos(angle);
        let sa = sin(angle);
        let rp = vec2f(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);
        let sp = rp / size;

        let d = sdShamrock(sp);

        let edge = 0.5 / (size * min(u.iResolution.x, u.iResolution.y));
        let alpha = smoothstep(edge, -edge, d);

        if (alpha > 0.001) {
            // Varying greens per clover
            let greenShift = h4 * 0.3;
            let cloverCol = vec3f(
                0.1 + greenShift * 0.15,
                0.55 + greenShift * 0.3,
                0.1 + greenShift * 0.1
            );
            let opacity = mix(0.75, 0.9, dark) * (0.5 + h4 * 0.5);
            col = mix(col, cloverCol, alpha * opacity);
        }
    }

    return vec4f(col, 1.0);
}

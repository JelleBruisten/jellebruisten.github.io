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

// Heart SDF by Inigo Quilez — exact signed distance to a heart shape.
// Input p should be centered at origin, ~[-1,1] range.
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

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.95, 0.90, 0.92), vec3f(0.05, 0.02, 0.08), dark);
    var col = bg;

    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.035), 8, 60);
    let t = u.iTime;

    for (var i = 0; i < 80; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);

        // Float upward
        let speed = 0.02 + h2 * 0.04;
        let size = 0.02 + h3 * 0.03;

        let pad = 0.08;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.03 * sin(t * 0.4 + fi * 2.1);
        // Float upward: y decreases in WebGPU (y=0 top)
        let y = (1.0 + pad) - fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        // Bounding circle
        if (dot(diff, diff) > size * size * 4.0) { continue; }

        // Transform to heart SDF space: heart points up, scale by size
        let hp = diff / size;
        let d = sdHeart(vec2f(hp.x, -hp.y + 0.5));

        let edge = 0.5 / (size * min(u.iResolution.x, u.iResolution.y));
        let heartAlpha = smoothstep(edge, -edge, d);

        if (heartAlpha > 0.001) {
            // Vivid pink/red/magenta per heart
            let hue = h4 * 0.12;
            let heartCol = vec3f(
                0.85 + 0.15 * cos(hue * 6.2832),
                0.15 + 0.2 * cos(hue * 6.2832 + 1.5),
                0.3 + 0.3 * cos(hue * 6.2832 + 3.0)
            );
            let opacity = mix(0.75, 0.9, dark) * (0.5 + h4 * 0.5);
            col = mix(col, heartCol, heartAlpha * opacity);
        }
    }

    return vec4f(col, 1.0);
}

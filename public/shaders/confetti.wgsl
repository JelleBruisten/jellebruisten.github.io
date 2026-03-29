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

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.94, 0.95, 0.97), vec3f(0.03, 0.03, 0.07), dark);
    var col = bg;

    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.06), 15, 150);
    let t = u.iTime;

    for (var i = 0; i < 200; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);
        let h5 = hash(fi + 311.9);

        let speed = 0.03 + h2 * 0.06;
        let sizeW = 0.006 + h3 * 0.008;
        let sizeH = sizeW * (1.5 + h5);
        // Bounding radius: the diagonal of the rectangle covers the rotated extent
        let bound = sqrt(sizeW * sizeW + sizeH * sizeH) + 0.003;

        let pad = 0.05;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.06 * sin(t * 0.6 + fi * 1.3);
        // y increases downward in WebGPU (y=0 at top)
        let y = -pad + fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        // Cheap circular bounding check before rotation
        if (dot(diff, diff) > bound * bound * aspect) { continue; }

        let angle = t * (0.5 + h4) + fi * 3.7;
        let ca = cos(angle);
        let sa = sin(angle);
        let rotated = vec2f(
            diff.x * ca - diff.y * sa,
            diff.x * sa + diff.y * ca
        );

        // Sharp-cornered rectangle SDF (Chebyshev distance)
        let q = abs(rotated) - vec2f(sizeW, sizeH);
        let d = max(q.x, q.y);

        let edge = 1.2 / min(u.iResolution.x, u.iResolution.y);
        let alpha = smoothstep(edge, -edge, d);

        if (alpha > 0.001) {
            let hue = h4 * 6.2832;
            let confettiCol = vec3f(
                0.55 + 0.45 * cos(hue),
                0.55 + 0.45 * cos(hue + 2.094),
                0.55 + 0.45 * cos(hue + 4.189)
            );
            let opacity = mix(0.65, 0.9, dark);
            col = mix(col, confettiCol, alpha * opacity);
        }
    }

    return vec4f(col, 1.0);
}

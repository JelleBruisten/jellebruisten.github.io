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

// Egg SDF in pixel space
fn sdEgg(p: vec2f, rad: f32) -> f32 {
    let squeeze = 1.0 + (p.y / rad) * 0.2;
    let ep = vec2f(p.x * squeeze, p.y * 1.3);
    return length(ep) - rad;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;
    let res = min(u.iResolution.x, u.iResolution.y);

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.92, 0.94, 0.88), vec3f(0.04, 0.04, 0.07), dark);
    var col = bg;

    let qScale = mix(0.35, 1.0, u.iQuality);
    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.018 * qScale), 3, 18);
    let t = u.iTime;

    for (var i = 0; i < 25; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);
        let h5 = hash(fi + 311.9);

        let speed = 0.01 + h2 * 0.02;
        let size = 0.06 + h3 * 0.05;
        let radPx = size * res * 0.5;

        let pad = 0.12;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.03 * sin(t * 0.3 + fi * 1.7);
        let y = -pad + fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 5.0) { continue; }

        let angle = sin(t * 0.4 + fi * 3.1) * 0.25 + h4 * 0.3 - 0.15;
        let ca = cos(angle);
        let sa = sin(angle);
        let rp = vec2f(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);

        let pp = rp * res;
        let d = sdEgg(pp, radPx);

        let borderD = abs(d) - 1.5;
        let borderAlpha = smoothstep(0.75, -0.75, borderD);
        let borderCol = mix(vec3f(0.35, 0.28, 0.42), vec3f(0.55, 0.48, 0.62), dark);

        let eggAlpha = smoothstep(0.75, -0.75, d);

        if (eggAlpha > 0.001 || borderAlpha > 0.001) {
            let sp = pp / radPx;

            // Bold saturated colors
            let hue = h4 * 6.2832;
            let baseCol = vec3f(
                0.60 + 0.35 * cos(hue),
                0.60 + 0.35 * cos(hue + 2.094),
                0.60 + 0.35 * cos(hue + 4.189)
            );

            let stripeType = i32(h5 * 3.0);
            var pattern = 0.0;
            let localY = sp.y;

            if (stripeType == 0) {
                // Bold horizontal stripes
                pattern = smoothstep(0.06, 0.0, abs(fract(localY * 2.0 + 0.25) - 0.5) - 0.15);
            } else if (stripeType == 1) {
                // Bold zigzag
                let zag = abs(fract(localY * 1.5) - 0.5) * 2.0;
                let zigX = sp.x - (zag - 0.5) * 0.5;
                pattern = smoothstep(0.15, 0.03, abs(zigX));
            } else {
                // Bold dots
                let dotY = fract(localY * 2.0 + 0.25);
                let dotX = fract(sp.x * 2.0 + 0.25);
                let dotD = length(vec2f(dotX - 0.5, dotY - 0.5));
                pattern = smoothstep(0.28, 0.18, dotD);
            }

            // Contrasting stripe color
            let hue2 = (h4 + 0.4 + h5 * 0.2) * 6.2832;
            let stripeCol = vec3f(
                0.50 + 0.40 * cos(hue2),
                0.50 + 0.40 * cos(hue2 + 2.094),
                0.50 + 0.40 * cos(hue2 + 4.189)
            );

            let eggCol = mix(baseCol, stripeCol, pattern);

            // Draw border first (behind egg fill)
            col = mix(col, borderCol, borderAlpha * mix(0.7, 0.3, dark));
            // Then egg fill on top
            col = mix(col, eggCol, eggAlpha * 0.95);
        }
    }

    return vec4f(col, 1.0);
}

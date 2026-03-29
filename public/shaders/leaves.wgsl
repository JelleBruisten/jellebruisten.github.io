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

// Leaf SDF: pointed oval (wider in the middle, pointed at both ends)
fn sdLeaf(p: vec2f, rad: f32) -> f32 {
    // Elongated: stretch y by 1.8x
    let lp = vec2f(p.x, p.y * 0.55);
    // Base oval
    var d = length(lp) - rad * 0.45;
    // Pinch both ends: narrow where |p.y| is large
    let pinch = abs(p.y) / rad;
    d += pinch * pinch * rad * 0.25;
    return d;
}

// Leaf vein pattern: central line + branching diagonals
fn leafVein(p: vec2f, rad: f32) -> f32 {
    var vein = 0.0;
    // Central vein (vertical line)
    let centerD = abs(p.x);
    vein = max(vein, smoothstep(rad * 0.03, 0.0, centerD));
    // Side veins: 3 pairs branching from center
    for (var i = 0; i < 3; i++) {
        let fi = f32(i);
        let vy = (fi - 1.0) * rad * 0.25;
        let bp = p - vec2f(0.0, vy);
        // Diagonal line going outward: |y - slope*x|
        let slope = 0.6;
        let ld = abs(bp.y - abs(bp.x) * slope);
        let mask = step(0.0, abs(bp.x)) * smoothstep(rad * 0.35, rad * 0.1, abs(bp.x));
        vein = max(vein, smoothstep(rad * 0.025, 0.0, ld) * mask * 0.6);
    }
    return vein;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;
    let res = min(u.iResolution.x, u.iResolution.y);

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.90, 0.94, 0.90), vec3f(0.02, 0.05, 0.03), dark);
    var col = bg;

    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.02), 5, 25);
    let t = u.iTime;

    for (var i = 0; i < 30; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);
        let h4 = hash(fi + 237.1);

        let speed = 0.01 + h2 * 0.02;
        let size = 0.03 + h3 * 0.03;
        let radPx = size * res;

        let pad = 0.1;
        let range = 1.0 + 2.0 * pad;
        let x = h1 + 0.04 * sin(t * 0.3 + fi * 1.9);
        // Fall downward in WebGPU
        let y = -pad + fract(h2 + t * speed) * range;

        let center = vec2f(x, y);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 5.0) { continue; }

        // Tumble rotation — leaves spin more than other shapes
        let angle = t * (0.3 + h4 * 0.5) + fi * 2.7;
        let ca = cos(angle);
        let sa = sin(angle);
        let rp = vec2f(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);

        let pp = rp * res;
        let d = sdLeaf(pp, radPx);

        let alpha = smoothstep(0.75, -0.75, d);

        if (alpha > 0.001) {
            let sp = pp / radPx;

            // Varying greens/teals per leaf
            let hueShift = h4 * 0.4;
            let leafCol = vec3f(
                0.15 + hueShift * 0.2,
                0.50 + hueShift * 0.25,
                0.12 + hueShift * 0.3
            );

            // Darker vein pattern
            let vein = leafVein(pp, radPx);
            let veinCol = leafCol * 0.5;
            let finalCol = mix(leafCol, veinCol, vein);

            let opacity = mix(0.7, 0.85, dark) * (0.5 + h4 * 0.5);
            col = mix(col, finalCol, alpha * opacity);
        }
    }

    return vec4f(col, 1.0);
}

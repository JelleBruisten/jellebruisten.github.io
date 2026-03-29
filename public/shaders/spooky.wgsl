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

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let uu = f * f * (3.0 - 2.0 * f);
    let a = hash(dot(i, vec2f(127.1, 311.7)));
    let b = hash(dot(i + vec2f(1.0, 0.0), vec2f(127.1, 311.7)));
    let c = hash(dot(i + vec2f(0.0, 1.0), vec2f(127.1, 311.7)));
    let d = hash(dot(i + vec2f(1.0, 1.0), vec2f(127.1, 311.7)));
    return mix(mix(a, b, uu.x), mix(c, d, uu.x), uu.y);
}

fn fbm(p: vec2f) -> f32 {
    var val = 0.0;
    var amp = 0.5;
    var pos = p;
    for (var i = 0; i < 4; i++) {
        val += amp * noise(pos);
        pos *= 2.1;
        amp *= 0.5;
    }
    return val;
}

// Pumpkin: wide ellipse + stem. Simple and clean.
fn sdPumpkin(p: vec2f, rad: f32) -> f32 {
    // Wide squashed body (negative y = top)
    let ep = vec2f(p.x * 0.85, p.y * 1.3);
    var d = length(ep) - rad;
    // Stem on top (negative y direction)
    let stemP = p - vec2f(0.0, -rad * 0.72);
    let stem = max(abs(stemP.x) - rad * 0.06, abs(stemP.y) - rad * 0.12);
    d = min(d, stem);
    return d;
}

// Jack-o-lantern face: triangle eyes + crescent grin. Returns 0-1 mask.
fn pumpkinFace(p: vec2f, rad: f32) -> f32 {
    var face = 0.0;
    // Triangle eyes — abs(p.x) mirrors both sides
    // Centered at ±0.22*rad horizontally, slightly above center
    let ep = vec2f(abs(p.x) - rad * 0.22, p.y + rad * 0.08);
    let s = rad * 0.13;
    // Triangle pointing down: flat top at ep.y = -s*0.5, tip at ep.y = +s
    // Width shrinks linearly from top to tip
    let triW = s * clamp(1.0 - (ep.y + s * 0.5) / (s * 1.5), 0.0, 1.0);
    let triD = max(max(ep.y - s, -ep.y - s * 0.5), abs(ep.x) - triW);
    face = max(face, smoothstep(0.75, -0.75, triD));
    // Grin: crescent from two offset circles
    let grinY = rad * 0.18;
    let outerD = length(p - vec2f(0.0, grinY)) - rad * 0.3;
    let innerD = length(p - vec2f(0.0, grinY - rad * 0.08)) - rad * 0.25;
    // Inside outer but outside inner = crescent, clip to bottom half only
    let grin = max(outerD, -innerD);
    let grinD = max(grin, -(p.y - grinY + rad * 0.05));
    face = max(face, smoothstep(0.75, -0.75, grinD));
    return face;
}

// Bat: body + two triangular wings. Works well at any size.
fn sdBat(p: vec2f, rad: f32) -> f32 {
    let ap = vec2f(abs(p.x), p.y);
    // Round body
    var d = length(ap) - rad * 0.3;
    // Ears
    let earP = ap - vec2f(rad * 0.15, -rad * 0.3);
    d = min(d, length(earP * vec2f(2.0, 1.0)) - rad * 0.12);
    // Wings: triangle from body outward
    // Wing tip at (rad, -rad*0.1), base at body edge
    let wingP = ap - vec2f(rad * 0.2, 0.0);
    let wingW = rad * 0.85;
    let wingH = rad * 0.55;
    // Triangle: top edge slopes down, bottom edge slopes up slightly
    let topEdge = wingP.y + wingH - wingP.x * (wingH * 1.5 / wingW);
    let botEdge = -wingP.y - wingP.x * (wingH * 0.3 / wingW);
    let rightEdge = wingP.x - wingW;
    let leftEdge = -wingP.x;
    let wing = max(max(rightEdge, leftEdge), max(-topEdge, -botEdge));
    d = min(d, wing);
    return d;
}

// Ghost: circle body + cosine wave bottom (adapted from Shadertoy reference)
fn sdGhost(p: vec2f, rad: f32) -> f32 {
    // Main body: one big circle
    var d = length(p) - rad * 0.7;
    // Wavy bottom cut: cosine wave trims the bottom edge
    // In our coord system positive y = down, so this cuts the lower part
    let waveBottom = cos(p.x / (rad * 0.2)) * rad * 0.07 + rad * 0.5;
    d = max(d, p.y - waveBottom);
    return d;
}

// Ghost face: two oval eyes + small oval mouth
fn ghostFace(p: vec2f, rad: f32) -> f32 {
    var face = 0.0;
    // Two oval eyes (vertically stretched)
    let eyeR = rad * 0.11;
    let lEye = length((p - vec2f(-rad * 0.22, -rad * 0.05)) * vec2f(1.0, 0.7)) - eyeR;
    let rEye = length((p - vec2f( rad * 0.22, -rad * 0.05)) * vec2f(1.0, 0.7)) - eyeR;
    face = max(face, smoothstep(0.75, -0.75, min(lEye, rEye)));
    // Small oval mouth below eyes
    let mouthR = rad * 0.07;
    let mouth = length((p - vec2f(0.0, rad * 0.18)) * vec2f(1.0, 0.7)) - mouthR;
    face = max(face, smoothstep(0.75, -0.75, mouth));
    return face;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;
    let res = min(u.iResolution.x, u.iResolution.y);

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.30, 0.26, 0.35), vec3f(0.02, 0.01, 0.05), dark);
    var col = bg;

    let t = u.iTime;

    // Fog
    let fogUV = vec2f(uv.x * aspect * 2.0 + t * 0.04, uv.y * 2.0 + t * 0.015);
    let fog = fbm(fogUV) * 0.25;
    let fogColor = mix(vec3f(0.20, 0.16, 0.25), vec3f(0.06, 0.04, 0.12), dark);
    col += fogColor * fog;

    let count = clamp(i32(sqrt(u.iResolution.x * u.iResolution.y) * 0.02), 5, 20);

    for (var i = 0; i < 25; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi * 17.3);
        let h2 = hash(fi * 31.7);
        let h3 = hash(fi * 53.1);
        let h4 = hash(fi * 71.9);

        // Round-robin ensures all 3 shapes appear evenly from the start
        let shapeType = i % 3;

        let wx = h1 + 0.04 * sin(t * 0.2 + fi * 2.3);
        let speed = 0.008 + h2 * 0.015;
        let pad = 0.12;
        let range = 1.0 + 2.0 * pad;
        let wy = (1.0 + pad) - fract(h2 + t * speed) * range;

        let center = vec2f(wx, wy);
        let diff = vec2f((uv.x - center.x) * aspect, uv.y - center.y);

        let size = 0.03 + h3 * 0.03;
        let radPx = size * res;

        if (dot(diff, diff) > size * size * 8.0) { continue; }

        let pp = diff * res;

        var d = radPx;
        var shapeCol = vec3f(0.0);

        var faceMask = 0.0;
        if (shapeType == 0) {
            d = sdPumpkin(pp, radPx);
            shapeCol = mix(vec3f(0.85, 0.45, 0.08), vec3f(1.0, 0.55, 0.1), dark);
            faceMask = pumpkinFace(pp, radPx);
        } else if (shapeType == 1) {
            d = sdBat(pp, radPx);
            shapeCol = mix(vec3f(0.30, 0.18, 0.40), vec3f(0.45, 0.25, 0.55), dark);
        } else {
            d = sdGhost(pp, radPx);
            shapeCol = mix(vec3f(0.78, 0.78, 0.82), vec3f(0.92, 0.92, 0.96), dark);
            faceMask = ghostFace(pp, radPx);
        }

        let alpha = smoothstep(0.75, -0.75, d);
        let pulse = 0.65 + 0.2 * sin(t * 0.6 + fi * 3.7);

        if (alpha > 0.001) {
            // Darken pumpkin face features (eyes + mouth glow dark)
            let faceCol = mix(shapeCol, vec3f(0.15, 0.05, 0.0), faceMask);
            col = mix(col, faceCol, alpha * pulse);
        }
    }

    // Candle glows along bottom (y near 1.0 in WebGPU)
    for (var i = 0; i < 5; i++) {
        let fi = f32(i);
        let cx = 0.1 + fi * 0.2;
        let cy = 0.94;
        let diff = vec2f((uv.x - cx) * aspect, uv.y - cy);
        let d = length(diff);

        let flicker = 0.4 + 0.6 * sin(t * 7.0 + fi * 5.3) * sin(t * 5.2 + fi * 3.1);
        let glow = exp(-d * d / 0.004) * max(flicker, 0.0);

        col += vec3f(1.0, 0.55, 0.08) * glow * 0.5;
    }

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

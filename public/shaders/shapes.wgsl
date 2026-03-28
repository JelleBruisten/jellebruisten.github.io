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

fn random(seed: f32) -> f32 {
    return fract(sin(seed) * 43758.545446523);
}

fn roundedBoxSDF(p: vec2f, size: vec2f, radius: f32) -> f32 {
    return length(max(abs(p) - size + radius, vec2f(0.0))) - radius;
}

fn modf_custom(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn layer(uv: vec2f, iTime: f32, numShapes: i32, speed: f32, sizeFactor: f32, verticalSpacing: f32) -> f32 {
    var m: f32 = 0.0;

    for (var i: i32 = 0; i < numShapes; i++) {
        let fi   = f32(i);
        let modA = iTime * speed + fi * verticalSpacing + random(fi);
        let modB = 1.0 + verticalSpacing;
        let iter = floor(modA / modB);

        let xPos       = mix(-0.78, 0.78, random(iter * 3.17 + fi * 0.1));
        let timeOffset = modf_custom(modA, modB);
        let yPos       = -0.55 + timeOffset;

        let visibility = smoothstep(-0.55, -0.42, yPos) * smoothstep(0.54, 0.40, yPos);

        // Size variety: small / medium / large
        let sizeSeed = random(iter * 2.31 + fi * 0.37);
        let sc       = (0.030 + sizeSeed * sizeSeed * 0.12) * sizeFactor;
        let aspect   = 0.6 + random(iter * 1.71 + fi * 0.53) * 2.0;
        let baseSize = vec2f(sc * aspect, sc);

        // Morph rectangle → circle as shape rises
        let morphT    = smoothstep(-0.55, 0.40, yPos);
        let targetR   = min(baseSize.x, baseSize.y);
        let finalSize = mix(baseSize, vec2f(targetR, targetR), morphT);
        let radius    = mix(targetR * 0.15, targetR, morphT);

        // WGSL: y axis is flipped vs GLSL — negate yPos for the SDF center
        let p = uv + vec2f(-xPos, yPos);
        let d = roundedBoxSDF(p, finalSize, radius);
        let aa = fwidth(d);
        m = max(m, visibility * (1.0 - smoothstep(0.0, aa, d)));
    }

    return m;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    uv.x  *= uniforms.iResolution.x / uniforms.iResolution.y;

    var col: f32 = 0.0;
    for (var i: f32 = 0.0; i < 3.0; i += 1.0) {
        let speed   = 0.20 / (i + 1.0);
        let size    = 0.90 / (i + 1.0);
        let spacing = 2.80 / (i + 1.0);
        let num     = i32(floor((5.0 - i) * 3.0));
        let weight  = 1.0 - i * 0.15;
        col = max(col, layer(uv, uniforms.iTime + 150.123, num, speed, size, spacing) * weight);
    }

    let darkness   = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let bgDark     = vec3f(0.01, 0.02, 0.06);
    let bgLight    = vec3f(0.93, 0.94, 0.97);
    let shapeDark  = vec3f(0.22, 0.38, 0.82);
    let shapeLight = vec3f(0.32, 0.46, 0.78);
    let bg         = mix(bgLight, bgDark, darkness);
    let shapeColor = mix(shapeLight, shapeDark, darkness);

    return vec4f(mix(bg, shapeColor, clamp(col, 0.0, 1.0)), 1.0);
}

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

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x  *= ar;

    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let NS = 48;
    var d1: f32 = 1e5;
    var d2: f32 = 1e5;
    var id: i32 = 0;

    for (var i = 0; i < NS; i++) {
        let f   = f32(i);
        let ox  = (hash(f * 1.73) - 0.5) * ar;
        let oy  =  hash(f * 2.31) - 0.5;
        let spd = 0.03 + hash(f * 3.97) * 0.025;
        let ph  = hash(f * 5.11) * 6.2832;
        let seed = vec2f(
            ox + 0.10 * cos(uniforms.iTime * spd + ph),
            oy + 0.08 * sin(uniforms.iTime * spd * 0.85 + ph + 1.1)
        );
        let d = length(uv - seed);
        if (d < d1) { d2 = d1; d1 = d; id = i; }
        else if (d < d2) { d2 = d; }
    }

    let edge = smoothstep(0.0, 0.018, d2 - d1);
    let hue  = hash(f32(id) * 7.13);

    let cellDark    = mix(vec3f(0.06, 0.10, 0.22), vec3f(0.12, 0.06, 0.28), hue);
    let borderDark  = mix(vec3f(0.30, 0.55, 1.00), vec3f(0.60, 0.25, 0.95), hue);
    let cellLight   = mix(vec3f(0.82, 0.88, 0.97), vec3f(0.88, 0.82, 0.96), hue);
    let borderLight = mix(vec3f(0.35, 0.50, 0.88), vec3f(0.60, 0.35, 0.82), hue);

    let cellColor   = mix(cellLight,   cellDark,   darkness);
    let borderColor = mix(borderLight, borderDark, darkness);

    var col = mix(borderColor, cellColor, edge);
    col     = mix(col, cellColor * (0.85 + 0.15 * darkness), d1 * 0.5 * edge);

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

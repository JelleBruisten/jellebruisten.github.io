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

fn hash2(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i),               hash2(i + vec2f(1.0, 0.0)), u.x),
        mix(hash2(i + vec2f(0.0, 1.0)), hash2(i + vec2f(1.0, 1.0)), u.x),
        u.y
    );
}

fn fbm(p: vec2f) -> f32 {
    return noise(p) * 0.5
         + noise(p * 2.0 + vec2f(5.2, 1.3)) * 0.25
         + noise(p * 4.0 + vec2f(1.7, 9.2)) * 0.125;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x *= ar;

    let t        = uniforms.iTime * 0.55;
    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    // Gentle animated FBM domain warp
    let p  = uv * 2.8;
    let wx = fbm(p + vec2f(t * 0.40, t * 0.30));
    let wy = fbm(p + vec2f(t * 0.30, t * 0.40) + vec2f(3.7, 1.9));
    let warped = uv + vec2f(wx - 0.5, wy - 0.5) * 0.13;

    // Directional cosine wave interference
    var wave = 0.0;
    for (var i = 0; i < 7; i++) {
        let fi    = f32(i);
        let angle = fi * 2.39996; // golden angle in radians
        let dir   = vec2f(cos(angle), sin(angle));
        let ph    = hash(fi * 3.17) * 6.2832;
        let spd   = 1.0 + hash(fi * 2.31) * 1.2;
        wave += cos(dot(warped * 10.0, dir) + t * spd + ph);
    }
    wave /= 7.0;

    // Caustic lines: sharp at constructive interference peaks
    let caustic = pow(max(wave * 0.5 + 0.5, 0.0), 3.0);

    // Dark: bright teal/blue lines on deep navy
    let bgDark      = vec3f(0.01, 0.03, 0.08);
    let causticDark = vec3f(0.12, 0.72, 0.92);
    let darkResult  = clamp(bgDark + causticDark * caustic * 0.85, vec3f(0.0), vec3f(1.0));

    // Light: blue-tinted water bg with bright caustic lines (realistic underwater look)
    let bgLight        = vec3f(0.62, 0.76, 0.92);     // clearly blue water base
    let causticBright  = vec3f(0.93, 0.96, 0.99);     // concentrated light at focal lines
    let lightResult    = mix(bgLight, causticBright, caustic * 0.90);

    let col = mix(lightResult, darkResult, darkness);
    return vec4f(col, 1.0);
}

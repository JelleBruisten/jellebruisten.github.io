// Vertex Shader
@vertex fn vs(
    @builtin(vertex_index) vertexIndex: u32
) -> @builtin(position) vec4f {
    let pos = array(
        vec2f(-1.0, -1.0),  // Bottom-left
        vec2f(1.0, -1.0),   // Bottom-right
        vec2f(-1.0, 1.0),   // Top-left

        vec2f(-1.0, 1.0),   // Top-left
        vec2f(1.0, -1.0),   // Bottom-right
        vec2f(1.0, 1.0)     // Top-right
    );

    return vec4f(pos[vertexIndex], 0.0, 1.0);
}

// Uniform Structure
struct Uniforms {
    iResolution: vec2f, // Screen resolution
    iTime: f32,         // Time
    iDarkmode: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Helper Functions
fn distanceToLine(p: vec2f, a: vec2f, b: vec2f) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * t);
}

fn fNoise(input: vec2f) -> f32 {
    var p = fract(input * vec2f(213.35, 495.19));
    p = p + dot(p, p + 348.93);
    return fract(p.x * p.y);
}

fn vec2Noise(p: vec2f) -> vec2f {
    let n = fNoise(p);
    return vec2f(n, fNoise(p + n));
}

fn getPointPosition(id: vec2f, offset: vec2f, time: f32) -> vec2f {
    let noise = vec2Noise(id + offset) * time;
    return offset + sin(noise) * 0.4;
}

fn getline(p: vec2f, a: vec2f, b: vec2f) -> f32 {
    let d = distanceToLine(p, a, b);
    var m = 1.0 - smoothstep(0.01, 0.03, d);
    let d2 = length(a - b);
    m *=  (1.0 - smoothstep(0.8, 1.2, d2)) * 0.5 + (1.0 - smoothstep(0.03, 0.05, abs(d2 - 0.75)));
    return m;
}

fn layer(uv: vec2f) -> f32 {
    var time = uniforms.iTime * 0.2 + 20.;
    var m = 0.0;
    var gv = fract(uv) - 0.5;
    var id = floor(uv);
    var p: array<vec2f, 9>;
    var i = 0;

    for (var y = -1.0; y <= 1.0; y = y + 1.0) {
        for (var x = -1.0; x <= 1.0; x = x + 1.0) {
            p[i] = getPointPosition(id, vec2f(x, y), time);
            i = i + 1;
        }
    }

    for (var i = 0u; i < 9u; i = i + 1) {
        m = m + getline(gv, p[4], p[i]);
    }

    m = m + getline(gv, p[1], p[3]);
    m = m + getline(gv, p[1], p[5]);
    m = m + getline(gv, p[7], p[3]);
    m = m + getline(gv, p[7], p[5]);

    return m;
}

// Fragment Shader
@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv: vec2f = (fragCoord.xy - vec2f(0.5, 0.5) *  uniforms.iResolution.xy) / uniforms.iResolution.y;
    var mouse = vec2f(0.0);
    var m = 0.0;
    let time = uniforms.iTime * 0.03;

    // Rotation matrix
    var s = sin(time);
    var c = cos(time);
    let rot = mat2x2<f32>(c, -s, s, c);
    uv = uv * rot;
    mouse = mouse * rot * 0.5;

    // Smoother accumulation and layer effects
    for (var i = 0.0; i <= 1.0; i = i + 0.2) {
        let z = fract(i + time);
        let size = mix(10.0, 0.5, z);
        let fade = smoothstep(0.0, 0.5, z) * (1.0 - smoothstep(0.8, 1.0, z));
        m = m + layer(uv * size + i * 15.0 + mouse) * fade;
    }

    // Remap u_darkmode from [0.2, 1.0] to [0.0, 1.0]
    let brightLevel = (uniforms.iDarkmode - 0.2) / (1.0 - 0.2);

    let darkColor = mix(vec3<f32>(0.0), vec3<f32>(0.3), vec3<f32>(m));
    let whiteColor = abs(vec3<f32>(uniforms.iDarkmode) - darkColor);

    let col = mix(darkColor, whiteColor, brightLevel);

        // Output to screen
    return vec4f(col, 1.0);
}

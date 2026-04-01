#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
uniform float u_quality;
out vec4 fragColor;

float hash(float n)  { return fract(sin(n) * 43758.5453); }
float hash2(vec2 p)  { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i),             hash2(i + vec2(1.0, 0.0)), u.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    return noise(p) * 0.5
         + noise(p * 2.0 + vec2(5.2, 1.3)) * 0.25
         + noise(p * 4.0 + vec2(1.7, 9.2)) * 0.125;
}

void main() {
    vec2  uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float ar = u_resolution.x / u_resolution.y;
    uv.x *= ar;

    float t        = u_time * 0.55;
    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    // Gentle animated FBM domain warp
    vec2  p  = uv * 2.8;
    float wx = fbm(p + vec2(t * 0.40, t * 0.30));
    float wy = fbm(p + vec2(t * 0.30, t * 0.40) + vec2(3.7, 1.9));
    vec2  warped = uv + vec2(wx - 0.5, wy - 0.5) * 0.13;

    // Directional cosine wave interference
    int WAVES = int(mix(3.0, 7.0, u_quality));
    float wave = 0.0;
    for (int i = 0; i < WAVES; i++) {
        float fi    = float(i);
        float angle = fi * 2.39996; // golden angle in radians
        vec2  dir   = vec2(cos(angle), sin(angle));
        float ph    = hash(fi * 3.17) * 6.2832;
        float spd   = 1.0 + hash(fi * 2.31) * 1.2;
        wave += cos(dot(warped * 10.0, dir) + t * spd + ph);
    }
    wave /= float(WAVES);

    // Caustic lines: sharp at constructive interference peaks
    float caustic = pow(max(wave * 0.5 + 0.5, 0.0), 3.0);

    // Dark: bright teal/blue lines on deep navy
    vec3  bgDark      = vec3(0.01, 0.03, 0.08);
    vec3  causticDark = vec3(0.12, 0.72, 0.92);
    vec3  darkResult  = clamp(bgDark + causticDark * caustic * 0.85, vec3(0.0), vec3(1.0));

    // Light: blue-tinted water bg with bright caustic lines (realistic underwater look)
    vec3  bgLight       = vec3(0.62, 0.76, 0.92);     // clearly blue water base
    vec3  causticBright = vec3(0.93, 0.96, 0.99);     // concentrated light at focal lines
    vec3  lightResult   = mix(bgLight, causticBright, caustic * 0.90);

    vec3 col = mix(lightResult, darkResult, darkness);
    fragColor = vec4(col, 1.0);
}

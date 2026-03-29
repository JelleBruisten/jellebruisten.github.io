#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.18, 0.12, 0.08), vec3(0.03, 0.02, 0.01), dark);
    vec3 col = bg;

    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.03), 8, 40);
    float t = u_time;

    for (int i = 0; i < 50; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);
        float h5 = hash(fi + 311.9);

        float speed = 0.005 + h2 * 0.012;
        float pad = 0.15;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.03 * sin(t * 0.2 + fi * 1.7);
        // Rise upward in WebGL (y increases)
        float y = -pad + fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);
        float d = length(diff);

        float twinkle = 0.5 + 0.5 * sin(t * (1.5 + h4 * 3.0) + fi * 4.7);
        float brightness = 0.4 + twinkle * 0.6;

        float coreSize = 0.004 + h3 * 0.004;
        float haloSize = 0.02 + h3 * 0.03;

        float core = exp(-d * d / (coreSize * coreSize)) * brightness;
        float halo = exp(-d * d / (haloSize * haloSize)) * brightness * 0.35;

        float warmth = h5 * 0.3;
        vec3 lightCol = vec3(
            1.0,
            0.7 - warmth * 0.15,
            0.2 - warmth * 0.15
        );

        vec3 glow = lightCol * (core + halo);
        col += glow * mix(0.6, 1.0, dark);
    }

    // Ground glow
    float groundGlow = exp(-(1.0 - uv.y) * 3.0) * 0.06 * dark;
    col += vec3(1.0, 0.6, 0.15) * groundGlow;

    fragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 1.0);
}

#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    vec2  uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float ar = u_resolution.x / u_resolution.y;
    uv.x    *= ar;

    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec3  bgDark   = vec3(0.02, 0.03, 0.08);
    vec3  bgLight  = vec3(0.92, 0.94, 0.97);
    vec3  inkDark  = vec3(0.45, 0.68, 1.00);
    vec3  inkLight = vec3(0.18, 0.35, 0.75);
    vec3  bg       = mix(bgLight, bgDark, darkness);
    vec3  ink      = mix(inkLight, inkDark, darkness);

    int         N    = u_resolution.x >= 768.0 ? 36 : 18;
    const float CONN = 0.28;

    vec2 p[36];
    for (int i = 0; i < N; i++) {
        float f   = float(i);
        float ox  = (hash(f * 1.73) - 0.5) * ar;
        float oy  =  hash(f * 2.31) - 0.5;
        float amp = 0.08 + hash(f * 3.97) * 0.06;
        float ph  = hash(f * 5.11) * 6.2832;
        float spd = 0.12 + hash(f * 6.83) * 0.10;
        p[i] = vec2(
            ox + amp        * cos(u_time * spd + ph),
            oy + amp * 0.75 * sin(u_time * spd * 0.8 + ph + 1.3)
        );
    }

    float acc = 0.0;

    // Connecting lines
    for (int i = 0; i < N; i++) {
        for (int j = i + 1; j < N; j++) {
            float d = length(p[i] - p[j]);
            if (d < CONN) {
                vec2  ab   = p[j] - p[i];
                float t    = clamp(dot(uv - p[i], ab) / dot(ab, ab), 0.0, 1.0);
                float dist = length(uv - (p[i] + ab * t));
                acc = max(acc, smoothstep(0.0025, 0.0, dist) * (1.0 - d / CONN) * 0.60);
            }
        }
    }

    // Dots + soft glow
    for (int i = 0; i < N; i++) {
        float d = length(uv - p[i]);
        acc = max(acc, smoothstep(0.009, 0.001, d));
        acc = max(acc, smoothstep(0.035, 0.0,   d) * 0.20);
    }

    fragColor = vec4(mix(bg, ink, clamp(acc, 0.0, 1.0)), 1.0);
}

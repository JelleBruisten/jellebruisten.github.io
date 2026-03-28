#version 300 es
precision mediump float;

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

    const int NS = 48;
    float d1 = 1e5, d2 = 1e5;
    int   id = 0;

    for (int i = 0; i < NS; i++) {
        float f   = float(i);
        float ox  = (hash(f * 1.73) - 0.5) * ar;
        float oy  =  hash(f * 2.31) - 0.5;
        float spd = 0.03 + hash(f * 3.97) * 0.025;
        float ph  = hash(f * 5.11) * 6.2832;
        vec2 seed = vec2(
            ox + 0.10 * cos(u_time * spd + ph),
            oy + 0.08 * sin(u_time * spd * 0.85 + ph + 1.1)
        );
        float d = length(uv - seed);
        if (d < d1) { d2 = d1; d1 = d; id = i; }
        else if (d < d2) { d2 = d; }
    }

    // Sharp cell border
    float edge = smoothstep(0.0, 0.018, d2 - d1);

    // Per-cell hue (0→1)
    float hue = hash(float(id) * 7.13);

    // Dark mode: deep navy cells, glowing blue/purple border
    vec3 cellDark   = mix(vec3(0.06, 0.10, 0.22), vec3(0.12, 0.06, 0.28), hue);
    vec3 borderDark = mix(vec3(0.30, 0.55, 1.00), vec3(0.60, 0.25, 0.95), hue);

    // Light mode: soft pastel cells, medium blue/violet border
    vec3 cellLight   = mix(vec3(0.82, 0.88, 0.97), vec3(0.88, 0.82, 0.96), hue);
    vec3 borderLight = mix(vec3(0.35, 0.50, 0.88), vec3(0.60, 0.35, 0.82), hue);

    vec3 cellColor   = mix(cellLight,   cellDark,   darkness);
    vec3 borderColor = mix(borderLight, borderDark, darkness);

    // Subtle interior depth: cells darken slightly toward their center
    vec3 col = mix(borderColor, cellColor, edge);
    col      = mix(col, cellColor * (0.85 + 0.15 * darkness), d1 * 0.5 * edge);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

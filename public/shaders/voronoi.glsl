#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
uniform float u_quality;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec3 cellDarkPalette(float t) {
    vec3 a = vec3(0.04, 0.06, 0.22);
    vec3 b = vec3(0.03, 0.14, 0.20);
    vec3 c = vec3(0.10, 0.04, 0.26);
    float t1 = clamp(t * 2.0, 0.0, 1.0);
    float t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

vec3 borderDarkPalette(float t) {
    vec3 a = vec3(0.20, 0.55, 1.00);
    vec3 b = vec3(0.00, 0.88, 0.78);
    vec3 c = vec3(0.60, 0.15, 0.92);
    float t1 = clamp(t * 2.0, 0.0, 1.0);
    float t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

vec3 cellLightPalette(float t) {
    vec3 a = vec3(0.89, 0.94, 0.99);
    vec3 b = vec3(0.88, 0.97, 0.96);
    vec3 c = vec3(0.94, 0.90, 0.99);
    float t1 = clamp(t * 2.0, 0.0, 1.0);
    float t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

vec3 borderLightPalette(float t) {
    vec3 a = vec3(0.25, 0.48, 0.88);
    vec3 b = vec3(0.08, 0.68, 0.62);
    vec3 c = vec3(0.55, 0.22, 0.82);
    float t1 = clamp(t * 2.0, 0.0, 1.0);
    float t2 = clamp(t * 2.0 - 1.0, 0.0, 1.0);
    return mix(mix(a, b, t1), c, t2);
}

void main() {
    vec2  uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float ar = u_resolution.x / u_resolution.y;
    uv.x    *= ar;

    float t        = u_time;
    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    int NS = int(mix(16.0, 48.0, u_quality));
    float d1 = 1e5, d2 = 1e5;
    int   id = 0;

    for (int i = 0; i < NS; i++) {
        float f   = float(i);
        float ox  = (hash(f * 1.73) - 0.5) * ar;
        float oy  =  hash(f * 2.31) - 0.5;
        float spd = 0.025 + hash(f * 3.97) * 0.02;
        float ph  = hash(f * 5.11) * 6.2832;
        vec2 seed = vec2(
            ox + 0.12 * cos(t * spd + ph),
            oy + 0.09 * sin(t * spd * 0.8 + ph + 1.1)
        );
        float d = length(uv - seed);
        if (d < d1) { d2 = d1; d1 = d; id = i; }
        else if (d < d2) { d2 = d; }
    }

    float borderDist = d2 - d1;
    float hue   = hash(float(id) * 7.13);
    float pulse = 0.84 + 0.16 * sin(t * (0.4 + hash(float(id) * 2.7) * 0.5) + hue * 6.28);

    float interior = 1.0 - smoothstep(0.0, 0.28, d1);

    // ── Dark mode ────────────────────────────────────────────────────────────
    vec3 cellD   = cellDarkPalette(hue)   + cellDarkPalette(hue) * interior * 0.5;
    vec3 borderD = borderDarkPalette(hue) * (0.9 + 0.1 * pulse);

    float edgeLine = 1.0 - smoothstep(0.0, 0.012, borderDist);
    float edgeGlow = exp(-borderDist * 28.0);

    vec3 colDark = cellD * pulse;
    colDark += borderD * edgeLine * 1.2;
    colDark += borderD * edgeGlow * 0.35;

    // ── Light mode ───────────────────────────────────────────────────────────
    vec3 cellL   = cellLightPalette(hue);
    vec3 borderL = borderLightPalette(hue) * 0.85;
    float edgeAlpha = smoothstep(0.007, 0.0, borderDist);

    vec3 colLight = cellL;
    colLight = mix(colLight, borderL, edgeAlpha);

    vec3 col = mix(colLight, colDark, darkness);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

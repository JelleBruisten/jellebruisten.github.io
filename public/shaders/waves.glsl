#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    vec2  uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float ar = u_resolution.x / u_resolution.y;
    uv.x    *= ar;

    float darkness    = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec3  bgDark      = vec3(0.02, 0.04, 0.12);
    vec3  bgLight     = vec3(0.90, 0.93, 0.98);
    vec3  peakDark    = vec3(0.05, 0.65, 0.90);  // teal
    vec3  troughDark  = vec3(0.40, 0.08, 0.75);  // violet
    vec3  peakLight   = vec3(0.15, 0.45, 0.85);  // blue
    vec3  troughLight = vec3(0.60, 0.30, 0.82);  // purple
    vec3  bg          = mix(bgLight, bgDark, darkness);
    vec3  peak        = mix(peakLight,   peakDark,   darkness);
    vec3  trough      = mix(troughLight, troughDark, darkness);

    const int NS = 6;
    float wave = 0.0;
    for (int i = 0; i < NS; i++) {
        float f    = float(i);
        float sx   = (hash(f * 1.31) - 0.5) * ar * 0.9;
        float sy   = (hash(f * 2.71) - 0.5) * 0.8;
        float dspd = 0.04 + hash(f * 3.17) * 0.03;
        vec2  src  = vec2(
            sx + 0.15 * cos(u_time * dspd + f * 1.1),
            sy + 0.10 * sin(u_time * dspd * 0.9 + f * 2.3)
        );
        float dist  = length(uv - src);
        float freq  = 14.0 + hash(f * 4.53) * 6.0;
        float wspd  = 1.8  + hash(f * 6.37) * 0.8;
        float phase = hash(f * 5.91) * 6.2832;
        wave += sin(dist * freq - u_time * wspd + phase);
    }
    wave /= float(NS); // [-1, 1]

    float t = wave * 0.5 + 0.5; // [0, 1]

    // Three-stop gradient: trough → bg → peak
    vec3 col = t < 0.5
        ? mix(trough, bg,   t * 2.0)
        : mix(bg,     peak, (t - 0.5) * 2.0);

    fragColor = vec4(col, 1.0);
}

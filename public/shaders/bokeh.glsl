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
    uv.x *= ar;

    float t        = u_time * 3.0;
    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3  darkGlow   = vec3(0.0);
    // Light: track the dominant (closest) blob per pixel for clear spatial structure
    float lightBest  = 0.0;
    vec3  lightColor = vec3(0.5);

    for (int i = 0; i < 32; i++) {
        float fi  = float(i);
        float bx  = (hash(fi * 1.73) - 0.5) * ar;
        float by  = hash(fi * 2.91) - 0.5;
        float spd = 0.045 + hash(fi * 3.17) * 0.065;
        float ph  = hash(fi * 5.31) * 6.2832;
        vec2  pos = vec2(
            bx + 0.16 * sin(t * spd + ph) + 0.06 * sin(t * spd * 2.1 + ph * 1.7),
            by + 0.12 * cos(t * spd * 0.75 + ph + 1.3) + 0.04 * cos(t * spd * 1.9 + ph)
        );

        float szSeed = hash(fi * 7.11);
        float sz = 0.05 + szSeed * szSeed * 0.22;
        float d  = length(uv - pos);
        float g  = exp(-d * d / (sz * sz));

        float hue = hash(fi * 4.37);
        // Dark palette: vibrant blue / teal / purple
        vec3 cd;
        if (hue < 0.33) {
            cd = mix(vec3(0.15, 0.45, 1.00), vec3(0.00, 0.80, 0.90), hue * 3.0);
        } else if (hue < 0.66) {
            cd = mix(vec3(0.55, 0.15, 0.95), vec3(0.15, 0.45, 1.00), (hue - 0.33) * 3.0);
        } else {
            cd = mix(vec3(0.85, 0.92, 1.00), vec3(0.55, 0.15, 0.95), (hue - 0.66) * 3.0);
        }
        // Light palette: darker blobs on near-white canvas
        vec3 cl;
        if (hue < 0.33) {
            cl = mix(vec3(0.18, 0.32, 0.72), vec3(0.20, 0.54, 0.50), hue * 3.0);
        } else if (hue < 0.66) {
            cl = mix(vec3(0.36, 0.20, 0.66), vec3(0.18, 0.32, 0.72), (hue - 0.33) * 3.0);
        } else {
            cl = mix(vec3(0.24, 0.50, 0.62), vec3(0.36, 0.20, 0.66), (hue - 0.66) * 3.0);
        }

        float pulse = 0.75 + 0.25 * sin(t * (0.15 + hash(fi * 2.13) * 0.25) + ph);

        darkGlow += cd * g * pulse;

        // For light mode: keep only the strongest blob contribution at this pixel
        float contrib = g * pulse;
        if (contrib > lightBest) {
            lightBest  = contrib;
            lightColor = cl;
        }
    }

    vec3  bgDark  = vec3(0.01, 0.02, 0.06);
    vec3  bgLight = vec3(0.95, 0.96, 0.99);

    vec3  darkResult  = clamp(bgDark + darkGlow * 0.65, vec3(0.0), vec3(1.0));
    // Blend toward the dominant blob color — up to 88% at blob centers
    vec3  lightResult = mix(bgLight, lightColor, clamp(lightBest * 0.94, 0.0, 0.94));

    vec3 col = mix(lightResult, darkResult, darkness);
    fragColor = vec4(col, 1.0);
}

#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
uniform float u_quality;
out vec4 fragColor;

float hash2(vec2 p) {
    vec2 q = fract(p * vec2(0.1031, 0.1030));
    q += dot(q, q.yx + 33.33);
    return fract((q.x + q.y) * q.x);
}

float noise2d(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i),                  hash2(i + vec2(1.0, 0.0)), u.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// 3-octave fractional Brownian motion
float fbm(vec2 p) {
    float v  = 0.0;
    float a  = 0.5;
    for (int i = 0; i < 3; i++) {
        v  += a * noise2d(p);
        p   = p * 2.07 + vec2(5.37, 1.92);
        a  *= 0.5;
    }
    return v;
}

void mainImage(out vec4 outColor, in vec2 fragCoord) {
    vec2  res  = u_resolution;
    float t    = u_time * 0.50;
    float dark = u_darkmode;

    vec2 uv = vec2(fragCoord.x / res.x, 1.0 - fragCoord.y / res.y);

    // darkness: 1 = dark mode, 0 = light mode
    float darkness = clamp(1.0 - (dark - 0.2) / 0.8, 0.0, 1.0);

    // Sky gradient
    vec3 skyDark  = mix(vec3(0.008, 0.014, 0.055), vec3(0.002, 0.004, 0.022), uv.y);
    vec3 skyLight = mix(vec3(0.940, 0.948, 0.995), vec3(0.740, 0.830, 0.975), uv.y);
    vec3 col = mix(skyLight, skyDark, darkness);

    // Five aurora ribbons
    for (int i = 0; i < int(mix(2.0, 5.0, u_quality)); i++) {
        float fi   = float(i);
        float seed = fi * 6.17;
        float drift = t * (0.14 + fi * 0.030);

        // Domain warp → vertical striations
        float warpX = uv.x * 2.0 + drift + seed;
        float warp  = (fbm(vec2(warpX, fi * 2.13 + t * 0.30)) - 0.5) * 0.16;

        // Ribbon height via FBM
        float hX     = uv.x * 1.3 + drift * 0.55 + seed * 1.5;
        float height = fbm(vec2(hX, t * 0.20 + fi * 1.63));
        float ribbonY = 0.34 + (fi / 4.0) * 0.44 + (height * 0.22 - 0.11);

        float dist = uv.y - (ribbonY + warp);

        float fallUp   = mix(26.0, 38.0, darkness);
        float fallDown = mix(15.0, 20.0, darkness);
        float glowUp   = exp(-max( dist, 0.0) * fallUp);
        float glowDown = exp(-max(-dist, 0.0) * fallDown);
        float rawGlow  = glowUp * glowDown;

        float shimmer = 0.72 + 0.28 * noise2d(vec2(uv.x * 9.0 + fi * 3.7, t * 4.0 + fi));
        float striX   = uv.x * 16.0 + warp * 14.0 + fi * 2.9;
        float stria   = 0.55 + 0.45 * noise2d(vec2(striX, t * 0.7 + fi * 0.9));

        float intensity  = rawGlow * shimmer * stria;
        float lightAlpha = rawGlow * (0.82 + 0.18 * shimmer) * 0.94 * (1.0 - darkness);

        float yPos  = clamp((-dist + 0.10) / 0.20, 0.0, 1.0);
        float tBand = fi / 4.0;

        // Dark mode: bright greens → blue/violet, punchy against deep navy
        vec3 coreD = mix(vec3(0.05, 1.00, 0.50), vec3(0.00, 0.88, 0.80), tBand);
        vec3 topD  = mix(vec3(0.20, 0.55, 1.00), vec3(0.60, 0.08, 0.95), tBand);
        vec3 bandD = mix(coreD, topD, yPos * yPos);

        // Light mode: vivid saturated hues
        vec3 coreL = mix(vec3(0.00, 0.65, 0.60), vec3(0.45, 0.00, 0.86), tBand);
        vec3 topL  = mix(vec3(0.05, 0.25, 0.98), vec3(0.90, 0.04, 0.68), tBand);
        vec3 bandL = mix(coreL, topL, yPos * yPos);

        col += bandD * intensity * 0.75 * darkness;
        col  = mix(col, bandL, lightAlpha);
    }

    // Atmospheric horizon glow (dark mode)
    float horizonGlow = exp(-uv.y * 5.5) * 0.10 * darkness;
    col += vec3(0.00, 0.22, 0.30) * horizonGlow;

    outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}

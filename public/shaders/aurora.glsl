#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

// Robust hash — stable at any input magnitude (no sin precision issues)
float hash2(vec2 p) {
    vec2 q = fract(p * vec2(0.1031, 0.1030));
    q += dot(q, q.yx + 33.33);
    return fract((q.x + q.y) * q.x);
}

float smoothNoise1d(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash2(vec2(i, 0.0)), hash2(vec2(i + 1.0, 0.0)), u);
}

float noise2d(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i + vec2(0.0, 0.0)), hash2(i + vec2(1.0, 0.0)), u.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2  res   = u_resolution;
    float t     = u_time;
    float dark  = u_darkmode;

    vec2 uv    = vec2(fragCoord.x / res.x, 1.0 - fragCoord.y / res.y);
    float mouseShift = 0.0;

    float darkness = clamp(1.0 - (dark - 0.2) / 0.8, 0.0, 1.0);

    vec3 bgDark  = vec3(0.010, 0.014, 0.055);
    vec3 bgLight = vec3(0.930, 0.935, 0.975);
    vec3 bg = mix(bgLight, bgDark, darkness);

    vec3 col = bg;

    for (int i = 0; i < 6; i++) {
        float fi = float(i);

        float tScale = 0.09 + fi * 0.025;
        float waveX  = uv.x * (1.1 + fi * 0.28);

        float n1 = noise2d(vec2(waveX       + t * tScale,        fi * 3.71));
        float n2 = noise2d(vec2(waveX * 0.6 - t * tScale * 0.75 + fi * 1.3, fi * 2.13 + 5.0));
        float wave = (n1 * 0.72 + n2 * 0.28) * 0.15 - 0.075;

        float centre = 0.28 + (fi / 5.0) * 0.40 + wave + mouseShift;
        float dist   = uv.y - centre;

        float glowUp   = exp(-max( dist, 0.0) * 20.0);
        float glowDown = exp(-max(-dist, 0.0) *  9.0);
        float intensity = glowUp * glowDown;

        float flicker = 0.82 + 0.18 * sin(t * 1.9 + fi * 2.4 + n1 * 2.8);

        float tBand = fi / 5.0;

        // Dark mode: vivid blue → violet, added onto dark background
        vec3 bandDark = mix(vec3(0.05, 0.55, 1.00), vec3(0.60, 0.10, 1.00), tBand);
        vec3 teal = vec3(0.00, 0.82, 0.72)
            * smoothNoise1d(uv.x * 3.2 + fi + t * 0.18)
            * 0.20;
        col += (bandDark + teal) * intensity * flicker * 0.45 * darkness;

        // Light mode: vivid blue → violet/rose blended onto light bg
        vec3 bandLight = mix(vec3(0.38, 0.58, 0.95), vec3(0.82, 0.42, 0.88), tBand);
        col = mix(col, bandLight, intensity * flicker * 0.90 * (1.0 - darkness));
    }

    // Point stars — each grid cell gets a random sub-cell position
    vec2  starsUV  = uv * vec2(res.x / res.y, 1.0) * 80.0;
    vec2  starCell = floor(starsUV);
    vec2  starFrac = fract(starsUV) - 0.5;
    float starH    = hash2(starCell);
    vec2  starPos  = vec2(hash2(starCell + vec2(13.7, 31.1)) - 0.5,
                          hash2(starCell + vec2(47.3, 21.9)) - 0.5) * 0.7;
    float starDist = length(starFrac - starPos);
    float starBright = step(0.978, starH) * smoothstep(0.05, 0.0, starDist) * darkness * 0.75;
    col += vec3(starBright);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}

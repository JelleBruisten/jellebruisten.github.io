#version 300 es
precision mediump float;

uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

float random(float seed) {
    return fract(sin(seed) * 43758.545446523);
}

float roundedBoxSDF(vec2 p, vec2 size, float radius) {
    return length(max(abs(p) - size + radius, 0.0)) - radius;
}

float layer(vec2 uv, float iTime, int numShapes, float speed, float sizeFactor, float verticalSpacing) {
    float m = 0.0;

    for (int i = 0; i < numShapes; i++) {
        float fi   = float(i);
        float modA = iTime * speed + fi * verticalSpacing + random(fi);
        float modB = 1.0 + verticalSpacing;
        float iter = floor(modA / modB);

        float xPos      = mix(-0.78, 0.78, random(iter * 3.17 + fi * 0.1));
        float timeOffset = mod(modA, modB);
        float yPos      = -0.55 + timeOffset;

        float visibility = smoothstep(-0.55, -0.42, yPos) * smoothstep(0.54, 0.40, yPos);

        // Size variety: small / medium / large driven by per-spawn seed
        float sizeSeed = random(iter * 2.31 + fi * 0.37);
        float sc       = (0.030 + sizeSeed * sizeSeed * 0.12) * sizeFactor; // skewed toward small
        float aspect   = 0.6 + random(iter * 1.71 + fi * 0.53) * 2.0;
        vec2  baseSize = vec2(sc * aspect, sc);

        // Morph rectangle → circle as shape rises (0 = rect, 1 = circle)
        float morphT    = smoothstep(-0.55, 0.40, yPos);
        float targetR   = min(baseSize.x, baseSize.y);
        vec2  finalSize = mix(baseSize, vec2(targetR, targetR), morphT);
        float radius    = mix(targetR * 0.15, targetR, morphT);

        float d  = roundedBoxSDF(uv - vec2(xPos, yPos), finalSize, radius);
        float aa = fwidth(d);
        m        = max(m, visibility * (1.0 - smoothstep(0.0, aa, d)));
    }

    return m;
}

void main() {
    vec2 uv  = gl_FragCoord.xy / u_resolution.xy - 0.5;
    uv.x    *= u_resolution.x / u_resolution.y;

    float col = 0.0;
    for (float i = 0.0; i < 3.0; i += 1.0) {
        float speed   = 0.20 / (i + 1.0);
        float size    = 0.90 / (i + 1.0);
        float spacing = 2.80 / (i + 1.0);
        int   num     = int(floor((5.0 - i) * 3.0));
        float weight  = 1.0 - i * 0.15;
        col = max(col, layer(uv, u_time + 150.123, num, speed, size, spacing) * weight);
    }

    float darkness   = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec3  bgDark     = vec3(0.01, 0.02, 0.06);
    vec3  bgLight    = vec3(0.93, 0.94, 0.97);
    vec3  shapeDark  = vec3(0.22, 0.38, 0.82);
    vec3  shapeLight = vec3(0.32, 0.46, 0.78);
    vec3  bg         = mix(bgLight, bgDark, darkness);
    vec3  shapeColor = mix(shapeLight, shapeDark, darkness);

    fragColor = vec4(mix(bg, shapeColor, clamp(col, 0.0, 1.0)), 1.0);
}

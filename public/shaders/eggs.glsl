#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

float sdEgg(vec2 p, float rad) {
    float squeeze = 1.0 + (p.y / rad) * 0.2;
    vec2 ep = vec2(p.x * squeeze, p.y * 1.3);
    return length(ep) - rad;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    float res = min(u_resolution.x, u_resolution.y);

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.92, 0.94, 0.88), vec3(0.04, 0.04, 0.07), dark);
    vec3 col = bg;

    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.018), 5, 18);
    float t = u_time;

    for (int i = 0; i < 25; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);
        float h5 = hash(fi + 311.9);

        float speed = 0.01 + h2 * 0.02;
        float size = 0.06 + h3 * 0.05;
        float radPx = size * res * 0.5;

        float pad = 0.12;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.03 * sin(t * 0.3 + fi * 1.7);
        float y = (1.0 + pad) - fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 5.0) continue;

        float angle = sin(t * 0.4 + fi * 3.1) * 0.25 + h4 * 0.3 - 0.15;
        float ca = cos(angle);
        float sa = sin(angle);
        vec2 rp = vec2(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);

        vec2 pp = vec2(rp.x, -rp.y) * res;
        float d = sdEgg(pp, radPx);

        float borderD = abs(d) - 1.5;
        float borderAlpha = smoothstep(0.75, -0.75, borderD);
        vec3 borderCol = mix(vec3(0.35, 0.28, 0.42), vec3(0.55, 0.48, 0.62), dark);

        float eggAlpha = smoothstep(0.75, -0.75, d);

        if (eggAlpha > 0.001 || borderAlpha > 0.001) {
            vec2 sp = pp / radPx;

            float hue = h4 * 6.2832;
            vec3 baseCol = vec3(
                0.60 + 0.35 * cos(hue),
                0.60 + 0.35 * cos(hue + 2.094),
                0.60 + 0.35 * cos(hue + 4.189)
            );

            int stripeType = int(h5 * 3.0);
            float pattern = 0.0;
            float localY = sp.y;

            if (stripeType == 0) {
                pattern = smoothstep(0.06, 0.0, abs(fract(localY * 2.0 + 0.25) - 0.5) - 0.15);
            } else if (stripeType == 1) {
                float zag = abs(fract(localY * 1.5) - 0.5) * 2.0;
                float zigX = sp.x - (zag - 0.5) * 0.5;
                pattern = smoothstep(0.15, 0.03, abs(zigX));
            } else {
                float dotY = fract(localY * 2.0 + 0.25);
                float dotX = fract(sp.x * 2.0 + 0.25);
                float dotD = length(vec2(dotX - 0.5, dotY - 0.5));
                pattern = smoothstep(0.28, 0.18, dotD);
            }

            float hue2 = (h4 + 0.4 + h5 * 0.2) * 6.2832;
            vec3 stripeCol = vec3(
                0.50 + 0.40 * cos(hue2),
                0.50 + 0.40 * cos(hue2 + 2.094),
                0.50 + 0.40 * cos(hue2 + 4.189)
            );

            vec3 eggCol = mix(baseCol, stripeCol, pattern);

            col = mix(col, borderCol, borderAlpha * mix(0.7, 0.3, dark));
            col = mix(col, eggCol, eggAlpha * 0.95);
        }
    }

    fragColor = vec4(col, 1.0);
}

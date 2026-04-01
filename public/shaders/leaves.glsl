#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;
uniform float u_quality;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

float sdLeaf(vec2 p, float rad) {
    vec2 lp = vec2(p.x, p.y * 0.55);
    float d = length(lp) - rad * 0.45;
    float pinch = abs(p.y) / rad;
    d += pinch * pinch * rad * 0.25;
    return d;
}

float leafVein(vec2 p, float rad) {
    float vein = 0.0;
    float centerD = abs(p.x);
    vein = max(vein, smoothstep(rad * 0.03, 0.0, centerD));
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float vy = (fi - 1.0) * rad * 0.25;
        vec2 bp = p - vec2(0.0, vy);
        float slope = 0.6;
        float ld = abs(bp.y - abs(bp.x) * slope);
        float mask = step(0.0, abs(bp.x)) * smoothstep(rad * 0.35, rad * 0.1, abs(bp.x));
        vein = max(vein, smoothstep(rad * 0.025, 0.0, ld) * mask * 0.6);
    }
    return vein;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    float res = min(u_resolution.x, u_resolution.y);

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.90, 0.94, 0.90), vec3(0.02, 0.05, 0.03), dark);
    vec3 col = bg;

    float qScale = mix(0.35, 1.0, u_quality);
    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.02 * qScale), 3, 25);
    float t = u_time;

    for (int i = 0; i < 30; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);

        float speed = 0.01 + h2 * 0.02;
        float size = 0.03 + h3 * 0.03;
        float radPx = size * res;

        float pad = 0.1;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.04 * sin(t * 0.3 + fi * 1.9);
        // Fall downward in WebGL
        float y = (1.0 + pad) - fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 5.0) continue;

        float angle = t * (0.3 + h4 * 0.5) + fi * 2.7;
        float ca = cos(angle);
        float sa = sin(angle);
        vec2 rp = vec2(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);

        vec2 pp = rp * res;
        float d = sdLeaf(pp, radPx);

        float alpha = smoothstep(0.75, -0.75, d);

        if (alpha > 0.001) {
            vec2 sp = pp / radPx;

            float hueShift = h4 * 0.4;
            vec3 leafCol = vec3(
                0.15 + hueShift * 0.2,
                0.50 + hueShift * 0.25,
                0.12 + hueShift * 0.3
            );

            float vein = leafVein(pp, radPx);
            vec3 veinCol = leafCol * 0.5;
            vec3 finalCol = mix(leafCol, veinCol, vein);

            float opacity = mix(0.7, 0.85, dark) * (0.5 + h4 * 0.5);
            col = mix(col, finalCol, alpha * opacity);
        }
    }

    fragColor = vec4(col, 1.0);
}

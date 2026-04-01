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

float dot2(vec2 v) { return dot(v, v); }

float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) {
        return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    }
    return sqrt(min(
        dot2(p - vec2(0.0, 1.0)),
        dot2(p - 0.5 * max(p.x + p.y, 0.0))
    )) * sign(p.x - p.y);
}

mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, s, -s, c);
}

float sdShamrock(vec2 p) {
    float leafScale = 0.55;
    float leafOffset = 0.18;

    vec2 p0 = (p - vec2(0.0, -leafOffset)) / leafScale;
    float d0 = sdHeart(vec2(p0.x, -p0.y + 0.5)) * leafScale;

    vec2 p1 = (rot2(2.094) * p - vec2(0.0, -leafOffset)) / leafScale;
    float d1 = sdHeart(vec2(p1.x, -p1.y + 0.5)) * leafScale;

    vec2 p2 = (rot2(4.189) * p - vec2(0.0, -leafOffset)) / leafScale;
    float d2 = sdHeart(vec2(p2.x, -p2.y + 0.5)) * leafScale;

    vec2 stemP = p - vec2(0.0, 0.35);
    float stem = max(abs(stemP.x) - 0.04, abs(stemP.y) - 0.3);

    return min(min(min(d0, d1), d2), stem);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.90, 0.95, 0.90), vec3(0.02, 0.06, 0.03), dark);
    vec3 col = bg;

    float qScale = mix(0.35, 1.0, u_quality);
    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.02 * qScale), 3, 35);
    float t = u_time;

    for (int i = 0; i < 40; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);

        float speed = 0.015 + h2 * 0.03;
        float size = 0.035 + h3 * 0.035;

        float pad = 0.08;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.03 * sin(t * 0.35 + fi * 1.9);
        // Float upward in WebGL (y=0 bottom): y increases
        float y = -pad + fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 6.0) continue;

        float angle = h4 * 0.5 - 0.25 + sin(t * 0.3 + fi * 2.0) * 0.1;
        float ca = cos(angle);
        float sa = sin(angle);
        vec2 rp = vec2(diff.x * ca - diff.y * sa, diff.x * sa + diff.y * ca);
        // Flip y for GLSL so the shamrock is right-side up
        vec2 sp = vec2(rp.x, -rp.y) / size;

        float d = sdShamrock(sp);

        float edge = 0.5 / (size * min(u_resolution.x, u_resolution.y));
        float alpha = smoothstep(edge, -edge, d);

        if (alpha > 0.001) {
            float greenShift = h4 * 0.3;
            vec3 cloverCol = vec3(
                0.1 + greenShift * 0.15,
                0.55 + greenShift * 0.3,
                0.1 + greenShift * 0.1
            );
            float opacity = mix(0.75, 0.9, dark) * (0.5 + h4 * 0.5);
            col = mix(col, cloverCol, alpha * opacity);
        }
    }

    fragColor = vec4(col, 1.0);
}

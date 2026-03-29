#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

float dot2(vec2 v) { return dot(v, v); }

// Heart SDF by Inigo Quilez
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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.95, 0.90, 0.92), vec3(0.05, 0.02, 0.08), dark);
    vec3 col = bg;

    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.035), 8, 60);
    float t = u_time;

    for (int i = 0; i < 80; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);

        float speed = 0.02 + h2 * 0.04;
        float size = 0.02 + h3 * 0.03;

        float pad = 0.08;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.03 * sin(t * 0.4 + fi * 2.1);
        float y = -pad + fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        if (dot(diff, diff) > size * size * 4.0) continue;

        vec2 hp = diff / size;
        float d = sdHeart(vec2(hp.x, hp.y + 0.5));

        float edge = 0.5 / (size * min(u_resolution.x, u_resolution.y));
        float heartAlpha = smoothstep(edge, -edge, d);

        if (heartAlpha > 0.001) {
            float hue = h4 * 0.12;
            vec3 heartCol = vec3(
                0.85 + 0.15 * cos(hue * 6.2832),
                0.15 + 0.2 * cos(hue * 6.2832 + 1.5),
                0.3 + 0.3 * cos(hue * 6.2832 + 3.0)
            );
            float opacity = mix(0.75, 0.9, dark) * (0.5 + h4 * 0.5);
            col = mix(col, heartCol, heartAlpha * opacity);
        }
    }

    fragColor = vec4(col, 1.0);
}

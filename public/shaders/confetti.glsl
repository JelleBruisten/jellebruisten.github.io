#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.94, 0.95, 0.97), vec3(0.03, 0.03, 0.07), dark);
    vec3 col = bg;

    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.06), 15, 150);
    float t = u_time;

    for (int i = 0; i < 200; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);
        float h4 = hash(fi + 237.1);
        float h5 = hash(fi + 311.9);

        float speed = 0.03 + h2 * 0.06;
        float sizeW = 0.006 + h3 * 0.008;
        float sizeH = sizeW * (1.5 + h5);
        float bound = sqrt(sizeW * sizeW + sizeH * sizeH) + 0.003;

        float pad = 0.05;
        float range = 1.0 + 2.0 * pad;
        float x = h1 + 0.06 * sin(t * 0.6 + fi * 1.3);
        float y = (1.0 + pad) - fract(h2 + t * speed) * range;

        vec2 center = vec2(x, y);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        // Cheap circular bounding check before rotation
        if (dot(diff, diff) > bound * bound * aspect) continue;

        float angle = t * (0.5 + h4) + fi * 3.7;
        float ca = cos(angle);
        float sa = sin(angle);
        vec2 rotated = vec2(
            diff.x * ca - diff.y * sa,
            diff.x * sa + diff.y * ca
        );

        // Proper box SDF
        vec2 q = abs(rotated) - vec2(sizeW, sizeH);
        float d = max(q.x, q.y);

        float edge = 1.2 / min(u_resolution.x, u_resolution.y);
        float alpha = smoothstep(edge, -edge, d);

        if (alpha > 0.001) {
            float hue = h4 * 6.2832;
            vec3 confettiCol = vec3(
                0.55 + 0.45 * cos(hue),
                0.55 + 0.45 * cos(hue + 2.094),
                0.55 + 0.45 * cos(hue + 4.189)
            );
            float opacity = mix(0.65, 0.9, dark);
            col = mix(col, confettiCol, alpha * opacity);
        }
    }

    fragColor = vec4(col, 1.0);
}

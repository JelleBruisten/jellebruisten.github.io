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

    // 0 = light, 1 = dark
    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    // Background
    vec3 bg = mix(vec3(0.70, 0.78, 0.82), vec3(0.06, 0.10, 0.22), dark);
    vec3 col = bg;

    // Snow parameters — adapt to dark/light
    vec3  snowColor = vec3(1.0);
    float opacity   = mix(0.7, 1.0, dark);
    float sizeScale = 2.0;

    // Scale count by aspect ratio so density stays constant across screen sizes.
    // 100 is the base density for a 1:1 square; wider screens get more flakes.
    int count = int(100.0 * max(aspect, 1.0));
    float t = u_time;

    for (int i = 0; i < 300; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi);
        float h2 = hash(fi + 63.7);
        float h3 = hash(fi + 142.3);

        // Each flake: random x, random speed, random size
        float speed = 0.04 + h2 * 0.08;
        float size  = (0.003 + h3 * 0.007) * sizeScale;

        // Position: drift horizontally with sin, fall downward and wrap
        float x = h1 + 0.05 * sin(t * 0.5 + fi * 1.7);
        float y = 1.0 - fract(h2 + t * speed);

        vec2 center = vec2(x, y);
        vec2 diff = abs(uv - center);

        // Bounding box early exit
        if (diff.x < size && diff.y < size) {
            float d = length(vec2(diff.x * aspect, diff.y));
            float circle = smoothstep(size, size * 0.2, d);
            col = mix(col, snowColor, circle * opacity);
        }
    }

    fragColor = vec4(col, 1.0);
}

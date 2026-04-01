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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.88, 0.90, 0.94), vec3(0.02, 0.02, 0.06), dark);
    vec3 col = bg;

    int NUM_ROCKETS = int(mix(3.0, 6.0, u_quality));
    int SPARKS = int(mix(15.0, 40.0, u_quality));
    float t = u_time;

    for (int r = 0; r < NUM_ROCKETS; r++) {
        float fr = float(r);
        float h1 = hash(fr * 17.3);
        float h2 = hash(fr * 31.7);
        float h3 = hash(fr * 53.1);

        float cycle = 3.0 + h1 * 2.0;
        float phase = mod(t + h2 * cycle, cycle);
        float launchTime = 0.8;

        float rx = 0.1 + (fr + 0.2 + h1 * 0.6) / float(NUM_ROCKETS) * 0.8;
        float burstY = 0.55 + h3 * 0.35;

        if (phase < launchTime) {
            float progress = phase / launchTime;
            float ry = progress * burstY;
            vec2 diff = uv - vec2(rx, ry);
            diff.x *= aspect;
            float d = length(diff);
            float glow = smoothstep(0.015, 0.002, d) * (0.6 + 0.4 * dark);
            vec3 trailCol = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.85, 0.5), progress);
            col += trailCol * glow;
        } else {
            float burstPhase = (phase - launchTime) / (cycle - launchTime);
            vec2 burstCenter = vec2(rx, burstY);
            float hueBase = h1 * 6.2832;

            for (int s = 0; s < SPARKS; s++) {
                float fs = float(s);
                float sh1 = hash(fr * 100.0 + fs);
                float sh2 = hash(fr * 100.0 + fs + 0.5);
                float angle = sh1 * 6.2832;
                float speed = 0.15 + sh2 * 0.25;

                float age = burstPhase;
                float sx = burstCenter.x + cos(angle) * speed * age;
                float sy = burstCenter.y + sin(angle) * speed * age - 0.3 * age * age;

                vec2 diff = uv - vec2(sx, sy);
                float d = length(vec2(diff.x * aspect, diff.y));

                float fade = max(0.0, 1.0 - age * 1.2);
                float size = 0.004 * fade;
                float glow = smoothstep(size * 3.0, 0.0, d) * fade;

                float hue = hueBase + sh1 * 1.5;
                vec3 sparkCol = vec3(
                    0.5 + 0.5 * cos(hue),
                    0.5 + 0.5 * cos(hue + 2.094),
                    0.5 + 0.5 * cos(hue + 4.189)
                );
                col += sparkCol * glow * (0.5 + 0.5 * dark);
            }
        }
    }

    fragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 1.0);
}

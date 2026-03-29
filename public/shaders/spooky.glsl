#version 300 es
precision highp float;

out vec4 fragColor;
uniform highp vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;

float hash(float n) {
    return fract(sin(n * 127.1) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 uu = f * f * (3.0 - 2.0 * f);
    float a = hash(dot(i, vec2(127.1, 311.7)));
    float b = hash(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7)));
    float c = hash(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7)));
    float d = hash(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7)));
    return mix(mix(a, b, uu.x), mix(c, d, uu.x), uu.y);
}

float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        val += amp * noise(p);
        p *= 2.1;
        amp *= 0.5;
    }
    return val;
}

float sdPumpkin(vec2 p, float rad) {
    vec2 ep = vec2(p.x * 0.85, p.y * 1.3);
    float d = length(ep) - rad;
    vec2 stemP = p - vec2(0.0, -rad * 0.72);
    float stem = max(abs(stemP.x) - rad * 0.06, abs(stemP.y) - rad * 0.12);
    d = min(d, stem);
    return d;
}

float pumpkinFace(vec2 p, float rad) {
    float face = 0.0;
    vec2 ep = vec2(abs(p.x) - rad * 0.22, p.y + rad * 0.08);
    float s = rad * 0.13;
    float triW = s * clamp(1.0 - (ep.y + s * 0.5) / (s * 1.5), 0.0, 1.0);
    float triD = max(max(ep.y - s, -ep.y - s * 0.5), abs(ep.x) - triW);
    face = max(face, smoothstep(0.75, -0.75, triD));
    float grinY = rad * 0.18;
    float outerD = length(p - vec2(0.0, grinY)) - rad * 0.3;
    float innerD = length(p - vec2(0.0, grinY - rad * 0.08)) - rad * 0.25;
    float grin = max(outerD, -innerD);
    float grinD = max(grin, -(p.y - grinY + rad * 0.05));
    face = max(face, smoothstep(0.75, -0.75, grinD));
    return face;
}

float sdBat(vec2 p, float rad) {
    vec2 ap = vec2(abs(p.x), p.y);
    float d = length(ap) - rad * 0.3;
    vec2 earP = ap - vec2(rad * 0.15, -rad * 0.3);
    d = min(d, length(earP * vec2(2.0, 1.0)) - rad * 0.12);
    vec2 wingP = ap - vec2(rad * 0.2, 0.0);
    float wingW = rad * 0.85;
    float wingH = rad * 0.55;
    float topEdge = wingP.y + wingH - wingP.x * (wingH * 1.5 / wingW);
    float botEdge = -wingP.y - wingP.x * (wingH * 0.3 / wingW);
    float rightEdge = wingP.x - wingW;
    float leftEdge = -wingP.x;
    float wing = max(max(rightEdge, leftEdge), max(-topEdge, -botEdge));
    d = min(d, wing);
    return d;
}

float sdGhost(vec2 p, float rad) {
    float d = length(p) - rad * 0.7;
    float waveBottom = cos(p.x / (rad * 0.2)) * rad * 0.07 + rad * 0.5;
    d = max(d, p.y - waveBottom);
    return d;
}

float ghostFace(vec2 p, float rad) {
    float face = 0.0;
    float eyeR = rad * 0.11;
    float lEye = length((p - vec2(-rad * 0.22, -rad * 0.05)) * vec2(1.0, 0.7)) - eyeR;
    float rEye = length((p - vec2( rad * 0.22, -rad * 0.05)) * vec2(1.0, 0.7)) - eyeR;
    face = max(face, smoothstep(0.75, -0.75, min(lEye, rEye)));
    float mouthR = rad * 0.07;
    float mouth = length((p - vec2(0.0, rad * 0.18)) * vec2(1.0, 0.7)) - mouthR;
    face = max(face, smoothstep(0.75, -0.75, mouth));
    return face;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    float res = min(u_resolution.x, u_resolution.y);

    float dark = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    vec3 bg = mix(vec3(0.30, 0.26, 0.35), vec3(0.02, 0.01, 0.05), dark);
    vec3 col = bg;

    float t = u_time;

    vec2 fogUV = vec2(uv.x * aspect * 2.0 + t * 0.04, uv.y * 2.0 + t * 0.015);
    float fog = fbm(fogUV) * 0.25;
    vec3 fogColor = mix(vec3(0.20, 0.16, 0.25), vec3(0.06, 0.04, 0.12), dark);
    col += fogColor * fog;

    int count = clamp(int(sqrt(u_resolution.x * u_resolution.y) * 0.02), 5, 20);

    for (int i = 0; i < 25; i++) {
        if (i >= count) break;
        float fi = float(i);
        float h1 = hash(fi * 17.3);
        float h2 = hash(fi * 31.7);
        float h3 = hash(fi * 53.1);
        float h4 = hash(fi * 71.9);

        // Round-robin ensures all 3 shapes appear evenly from the start
        int shapeType = i - (i / 3) * 3;

        float wx = h1 + 0.04 * sin(t * 0.2 + fi * 2.3);
        float speed = 0.008 + h2 * 0.015;
        float pad = 0.12;
        float range = 1.0 + 2.0 * pad;
        // WebGL y=0 bottom: float upward
        float wy = -pad + fract(h2 + t * speed) * range;

        vec2 center = vec2(wx, wy);
        vec2 diff = vec2((uv.x - center.x) * aspect, uv.y - center.y);

        float size = 0.03 + h3 * 0.03;
        float radPx = size * res;

        if (dot(diff, diff) > size * size * 8.0) continue;

        // Flip y so shapes are upright in WebGL
        vec2 pp = vec2(diff.x, -diff.y) * res;

        float d = radPx;
        vec3 shapeCol = vec3(0.0);
        float faceMask = 0.0;

        if (shapeType == 0) {
            d = sdPumpkin(pp, radPx);
            shapeCol = mix(vec3(0.85, 0.45, 0.08), vec3(1.0, 0.55, 0.1), dark);
            faceMask = pumpkinFace(pp, radPx);
        } else if (shapeType == 1) {
            d = sdBat(pp, radPx);
            shapeCol = mix(vec3(0.30, 0.18, 0.40), vec3(0.45, 0.25, 0.55), dark);
        } else {
            d = sdGhost(pp, radPx);
            shapeCol = mix(vec3(0.78, 0.78, 0.82), vec3(0.92, 0.92, 0.96), dark);
            faceMask = ghostFace(pp, radPx);
        }

        float alpha = smoothstep(0.75, -0.75, d);
        float pulse = 0.65 + 0.2 * sin(t * 0.6 + fi * 3.7);

        if (alpha > 0.001) {
            vec3 faceCol = mix(shapeCol, vec3(0.15, 0.05, 0.0), faceMask);
            col = mix(col, faceCol, alpha * pulse);
        }
    }

    // Candle glows along bottom
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float cx = 0.1 + fi * 0.2;
        float cy = 0.06;
        vec2 diff = vec2((uv.x - cx) * aspect, uv.y - cy);
        float d = length(diff);

        float flicker = 0.4 + 0.6 * sin(t * 7.0 + fi * 5.3) * sin(t * 5.2 + fi * 3.1);
        float glow = exp(-d * d / 0.004) * max(flicker, 0.0);

        col += vec3(1.0, 0.55, 0.08) * glow * 0.5;
    }

    fragColor = vec4(clamp(col, vec3(0.0), vec3(1.0)), 1.0);
}

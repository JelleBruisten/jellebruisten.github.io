#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Returns xy=local position in hex cell, zw=cell grid id
vec4 hexGrid(vec2 p) {
    const vec2 s = vec2(1.0, 1.7320508);
    vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h  = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
    return dot(h.xy, h.xy) < dot(h.zw, h.zw)
        ? vec4(h.xy, hC.xy)
        : vec4(h.zw, hC.zw + 0.5);
}

// Distance from cell center; 0.5 at the hex boundary
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    uv.x   *= u_resolution.x / u_resolution.y;

    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);

    float scale = 8.0;
    vec4  hx    = hexGrid(uv * scale);
    vec2  local = hx.xy;
    vec2  id    = hx.zw;

    float h = hash(id);
    float d = hexDist(local); // 0 at center, 0.5 at edge

    // Per-cell independent appear/disappear cycle
    float period  = 10.0 + hash(id * 3.17) * 10.0; // 10–20 s per cell
    float phase   = hash(id * 7.43) * 6.2832;
    float cycleT  = sin(u_time * 6.2832 / period + phase);
    float visible = smoothstep(-0.3, 0.7, cycleT); // ~65% of the time visible

    // Iris-open: hex radius grows from 0 → 0.48 as visible goes 0 → 1
    float hexR = visible * 0.48;
    float aa   = max(fwidth(d), 0.004);
    float fill = 1.0 - smoothstep(hexR, hexR + aa, d);

    // Secondary brightness wave drifting across the grid
    float dist       = length(id * vec2(1.0, 0.57735));
    float wave       = sin(u_time * 0.6 - dist * 1.2 + phase) * 0.5 + 0.5;
    float brightness = 0.70 + wave * 0.30;

    // Glowing border — only once cell is >80% open
    float borderT = smoothstep(0.42, 0.50, d) * smoothstep(0.75, 0.95, visible);

    vec3 cellDark    = mix(vec3(0.05, 0.09, 0.22), vec3(0.09, 0.04, 0.26), h);
    vec3 borderDark  = mix(vec3(0.25, 0.55, 1.00), vec3(0.55, 0.20, 0.95), h);
    vec3 cellLight   = mix(vec3(0.84, 0.90, 0.97), vec3(0.90, 0.84, 0.97), h);
    vec3 borderLight = mix(vec3(0.35, 0.50, 0.88), vec3(0.60, 0.30, 0.85), h);
    vec3 bgDark      = vec3(0.01, 0.02, 0.06);
    vec3 bgLight     = vec3(0.90, 0.92, 0.97);

    vec3 cell   = mix(cellLight,   cellDark,   darkness) * brightness;
    vec3 border = mix(borderLight, borderDark, darkness);
    vec3 bg     = mix(bgLight,     bgDark,     darkness);

    vec3 hexCol = mix(cell, border, borderT);
    vec3 col    = mix(bg, hexCol, fill);

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

// Sin-free 2D hash — avoids the per-cell sin() cost of the classic hash.
// Returns two independent values in [0,1) for a given integer cell id.
// "Hash without Sine" by Dave Hoskins.
vec2 hash2(vec2 p) {
    p  = fract(p * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 19.19);
    return fract((p.xx + p.yx) * p.xy);
}

void main() {
    vec2  uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    float ar = u_resolution.x / u_resolution.y;
    uv.x    *= ar;

    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec3  bgDark   = vec3(0.02, 0.03, 0.08);
    vec3  bgLight  = vec3(0.92, 0.94, 0.97);
    vec3  inkDark  = vec3(0.45, 0.68, 1.00);
    vec3  inkLight = vec3(0.18, 0.35, 0.75);
    vec3  bg       = mix(bgLight, bgDark, darkness);
    vec3  ink      = mix(inkLight, inkDark, darkness);

    // Grid: one particle per cell. Scale = cells per normalised height unit.
    // At 16:9 this gives ~4 × 7 ≈ 28 particles visible at any time — similar
    // density to the old shader but O(1) per pixel instead of O(N²).
    const float SCALE   = 4.0;
    const float CONN    = 0.85;  // max connection distance in cell units
    const float CONN_SQ = CONN * CONN;

    vec2 sv = uv * SCALE;
    vec2 gv = fract(sv) - 0.5;  // position inside current cell, [-0.5, 0.5]
    vec2 id = floor(sv);         // integer cell ID

    // Build particle positions for the 3×3 neighbourhood in current-cell-local
    // space.  Adding the cell offset (off) puts every position on the same
    // coordinate axis as gv so distances are directly comparable.
    vec2 pts[9];
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            int  k   = (dy + 1) * 3 + (dx + 1);
            vec2 off = vec2(float(dx), float(dy));
            vec2 h   = hash2(id + off);
            float spd = 0.15 + h.x * 0.10;   // unique speed per cell
            float phx = h.x * 6.2832;        // independent x phase
            float phy = h.y * 6.2832;        // independent y phase
            pts[k] = off + vec2(
                sin(u_time * spd       + phx) * 0.42,
                cos(u_time * spd * 0.7 + phy) * 0.42
            );
        }
    }

    float acc = 0.0;

    // Connection lines — all C(9,2) = 36 pairs in the 3×3 neighbourhood.
    //
    // Of those 36 pairs, 16 span cells that are 2+ steps apart; their minimum
    // possible distance is 1.36 cell units >> CONN, so they are always rejected
    // by the cheap squared-distance check without ever computing a sqrt.
    // The remaining ~8-12 close pairs pay the full line-distance calculation.
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 9; j++) {
            vec2  diff = pts[i] - pts[j];
            float d_sq = dot(diff, diff);
            if (d_sq < CONN_SQ) {
                float d    = sqrt(d_sq);
                vec2  ab   = pts[j] - pts[i];
                float t    = clamp(dot(gv - pts[i], ab) / dot(ab, ab), 0.0, 1.0);
                float dist = length(gv - (pts[i] + ab * t));
                acc = max(acc, smoothstep(0.02, 0.005, dist) * (1.0 - d / CONN) * 0.65);
            }
        }
    }

    // Dot core + soft glow.
    // Neighbour particles are always > 0.25 cell units from gv, so only the
    // centre-cell particle (pts[4]) ever falls within the dot/glow radius.
    float dc = length(gv - pts[4]);
    acc = max(acc, smoothstep(0.04, 0.012, dc));
    acc = max(acc, smoothstep(0.12, 0.0,   dc) * 0.15);

    fragColor = vec4(mix(bg, ink, clamp(acc, 0.0, 1.0)), 1.0);
}

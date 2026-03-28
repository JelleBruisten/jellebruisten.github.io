@vertex fn vs(
  @builtin(vertex_index) vertexIndex: u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

struct Uniforms {
    iResolution: vec2f,
    iTime: f32,
    iDarkmode: f32,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Sin-free 2D hash — avoids the per-cell sin() cost of the classic hash.
// Returns two independent values in [0,1) for a given integer cell id.
// "Hash without Sine" by Dave Hoskins.
fn hash2(p: vec2f) -> vec2f {
    var q = fract(p * vec2f(0.1031, 0.1030));
    q    += dot(q, q.yx + 19.19);
    return fract((q.xx + q.yx) * q.xy);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    var uv = fragCoord.xy / uniforms.iResolution - vec2f(0.5);
    let ar = uniforms.iResolution.x / uniforms.iResolution.y;
    uv.x  *= ar;

    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let bgDark   = vec3f(0.02, 0.03, 0.08);
    let bgLight  = vec3f(0.92, 0.94, 0.97);
    let inkDark  = vec3f(0.45, 0.68, 1.00);
    let inkLight = vec3f(0.18, 0.35, 0.75);
    let bg       = mix(bgLight, bgDark, darkness);
    let ink      = mix(inkLight, inkDark, darkness);

    // Grid: one particle per cell. Scale = cells per normalised height unit.
    // At 16:9 this gives ~4 × 7 ≈ 28 particles visible at any time — similar
    // density to the old shader but O(1) per pixel instead of O(N²).
    let SCALE   = 4.0f;
    let CONN    = 0.85f;
    let CONN_SQ = CONN * CONN;

    let sv = uv * SCALE;
    let gv = fract(sv) - vec2f(0.5);  // position inside current cell, [-0.5, 0.5]
    let id = floor(sv);                // integer cell ID

    // Build particle positions for the 3×3 neighbourhood in current-cell-local
    // space.  Adding the cell offset (off) puts every position on the same
    // coordinate axis as gv so distances are directly comparable.
    var pts: array<vec2f, 9>;
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            let k   = (dy + 1) * 3 + (dx + 1);
            let off = vec2f(f32(dx), f32(dy));
            let h   = hash2(id + off);
            let spd = 0.15 + h.x * 0.10;
            let phx = h.x * 6.2832;
            let phy = h.y * 6.2832;
            pts[k] = off + vec2f(
                sin(uniforms.iTime * spd       + phx) * 0.42,
                cos(uniforms.iTime * spd * 0.7 + phy) * 0.42
            );
        }
    }

    var acc = 0.0f;

    // Connection lines — all C(9,2) = 36 pairs in the 3×3 neighbourhood.
    //
    // Of those 36 pairs, 16 span cells that are 2+ steps apart; their minimum
    // possible distance is 1.36 cell units >> CONN, so they are always rejected
    // by the cheap squared-distance check without ever computing a sqrt.
    // The remaining ~8-12 close pairs pay the full line-distance calculation.
    for (var i = 0; i < 9; i++) {
        for (var j = i + 1; j < 9; j++) {
            let diff = pts[i] - pts[j];
            let d_sq = dot(diff, diff);
            if (d_sq < CONN_SQ) {
                let d    = sqrt(d_sq);
                let ab   = pts[j] - pts[i];
                let t    = clamp(dot(gv - pts[i], ab) / dot(ab, ab), 0.0, 1.0);
                let dist = length(gv - (pts[i] + ab * t));
                acc = max(acc, smoothstep(0.02, 0.005, dist) * (1.0 - d / CONN) * 0.65);
            }
        }
    }

    // Dot core + soft glow.
    // Neighbour particles are always > 0.25 cell units from gv, so only the
    // centre-cell particle (pts[4]) ever falls within the dot/glow radius.
    let dc = length(gv - pts[4]);
    acc = max(acc, smoothstep(0.04, 0.012, dc));
    acc = max(acc, smoothstep(0.12, 0.0,   dc) * 0.15);

    return vec4f(mix(bg, ink, clamp(acc, 0.0, 1.0)), 1.0);
}

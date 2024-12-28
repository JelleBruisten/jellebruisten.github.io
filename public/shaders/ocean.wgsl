@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
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

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let darkness = clamp(1.0 - (uniforms.iDarkmode - 0.2) / 0.8, 0.0, 1.0);
    let res = uniforms.iResolution;
    let t   = uniforms.iTime;
    let I   = fragCoord.xy;

    var d: f32 = 1.0;
    var z: f32 = 0.0;
    var r: f32 = 0.0;
    var O = vec4f(0.0);

    for (var i: i32 = 0; i < 90; i++) {
        // Sample point along the ray
        var p = z * normalize(vec3f(I + I, 0.0) - res.xyy);

        // Shift camera (raises p by 1 on all axes)
        p += vec3f(1.0);

        // Distance below the water surface (y = 0)
        r = max(-p.y, 0.0);

        // Mirror reflection: flip anything below y = 0 back up
        p.y += r + r;

        // Multi-octave cosine waves (5 octaves: d = 1, 2, 4, 8, 16)
        d = 1.0;
        while (d < 30.0) {
            p.y += cos(p.x * d + 2.0 * t * cos(d) + z) / d;
            d += d;
        }

        // SDF-like step distance to the surface
        let pz3 = p.z + 3.0;
        d = (0.1 * r + abs(p.y - 1.0) / (1.0 + r + r + r * r)
           + max(pz3, -pz3 * 0.1)) / 8.0;
        z += d;

        // Accumulate color: rainbow cycling with depth
        O += (cos(z * 0.5 + t + vec4f(0.0, 2.0, 4.0, 3.0)) + vec4f(1.3)) / d / z;
    }

    // Tanh tonemapping
    O = tanh(O / 900.0);
    let raw = O.rgb;

    // Dark mode: rainbow on black, pulled back slightly so it's less intense
    let darkCol = raw * 0.65;

    // Light mode: soft white base, rainbow wave colors blended in at peaks
    let lightBg = vec3f(0.93, 0.95, 0.98);
    let lum = dot(raw, vec3f(0.2126, 0.7152, 0.0722));
    let lightCol = mix(lightBg, raw * 0.45, lum * 0.85);

    let col = mix(lightCol, darkCol, darkness);
    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

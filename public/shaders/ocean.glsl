#version 300 es
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

void main() {
    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec2 I = gl_FragCoord.xy;

    float d = 1.0, z = 0.0, r = 0.0;
    vec4 O = vec4(0.0);

    for (float i = 0.0; i < 90.0; i += 1.0) {
        // Sample point along the ray
        vec3 p = z * normalize(vec3(I + I, 0.0) - u_resolution.xyy);

        // Shift camera (raises p by 1 on all axes)
        p += 1.0;

        // Distance below the water surface (y = 0)
        r = max(-p.y, 0.0);

        // Mirror reflection: flip anything below y = 0 back up
        p.y += r + r;

        // Multi-octave cosine waves (5 octaves: d = 1, 2, 4, 8, 16)
        for (d = 1.0; d < 30.0; d += d)
            p.y += cos(p.x * d + 2.0 * u_time * cos(d) + z) / d;

        // SDF-like step distance to the surface
        float pz3 = p.z + 3.0;
        d = (0.1 * r + abs(p.y - 1.0) / (1.0 + r + r + r * r)
           + max(pz3, -pz3 * 0.1)) / 8.0;
        z += d;

        // Accumulate color: rainbow cycling with depth
        O += (cos(z * 0.5 + u_time + vec4(0.0, 2.0, 4.0, 3.0)) + 1.3) / d / z;
    }

    // Tanh tonemapping
    O = tanh(O / 900.0);
    vec3 raw = O.rgb;

    // Dark mode: rainbow on black, pulled back slightly so it's less intense
    vec3 darkCol = raw * 0.65;

    // Light mode: soft white base, rainbow wave colors blended in at peaks
    vec3 lightBg = vec3(0.93, 0.95, 0.98);
    float lum = dot(raw, vec3(0.2126, 0.7152, 0.0722));
    vec3 lightCol = mix(lightBg, raw * 0.45, lum * 0.85);

    vec3 col = mix(lightCol, darkCol, darkness);
    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

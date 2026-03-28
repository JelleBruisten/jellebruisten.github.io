@vertex fn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let pos = array(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0,  1.0), vec2f(1.0, -1.0), vec2f( 1.0, 1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

struct Uniforms {
  iResolution: vec2f,
  iTime: f32,
  iDarkmode: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    // 0 = light, 1 = dark
    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    // Background
    let bg = mix(vec3f(0.70, 0.78, 0.82), vec3f(0.06, 0.10, 0.22), dark);
    var col = bg;

    // Snow parameters — adapt to dark/light
    let snowColor = vec3f(1.0);
    let opacity   = mix(0.7, 1.0, dark);
    let sizeScale = 2.0;

    // Scale count by aspect ratio so density stays constant across screen sizes.
    // 100 is the base density for a 1:1 square; wider screens get more flakes.
    let count = i32(100.0 * max(aspect, 1.0));
    let t = u.iTime;

    for (var i = 0; i < 300; i++) {
        if (i >= count) { break; }
        let fi = f32(i);
        let h1 = hash(fi);
        let h2 = hash(fi + 63.7);
        let h3 = hash(fi + 142.3);

        // Each flake: random x, random speed, random size
        let speed = 0.04 + h2 * 0.08;
        let size  = (0.003 + h3 * 0.007) * sizeScale;

        // Position: drift horizontally with sin, fall downward and wrap
        let x = h1 + 0.05 * sin(t * 0.5 + fi * 1.7);
        let y = fract(h2 + t * speed);

        let center = vec2f(x, y);
        let diff = abs(uv - center);

        // Bounding box early exit
        if (diff.x < size && diff.y < size) {
            let d = length(vec2f(diff.x * aspect, diff.y));
            let circle = smoothstep(size, size * 0.2, d);
            col = mix(col, snowColor, circle * opacity);
        }
    }

    return vec4f(col, 1.0);
}

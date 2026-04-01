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
  iQuality: f32,
}
@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let uv = fragCoord.xy / u.iResolution;
    let aspect = u.iResolution.x / u.iResolution.y;

    let dark = clamp(1.0 - (u.iDarkmode - 0.2) / 0.8, 0.0, 1.0);

    let bg = mix(vec3f(0.88, 0.90, 0.94), vec3f(0.02, 0.02, 0.06), dark);
    var col = bg;

    let NUM_ROCKETS = i32(mix(3.0, 6.0, u.iQuality));
    let SPARKS = i32(mix(15.0, 40.0, u.iQuality));
    let t = u.iTime;

    // In WebGPU: y=0 is top, y=1 is bottom.
    // Rockets launch from bottom (y~1) and rise upward (y decreases).
    // Gravity pulls sparks back down (y increases).

    for (var r = 0; r < NUM_ROCKETS; r++) {
        let fr = f32(r);
        let h1 = hash(fr * 17.3);
        let h2 = hash(fr * 31.7);
        let h3 = hash(fr * 53.1);

        let cycle = 3.0 + h1 * 2.0;
        let phase = (t + h2 * cycle) % cycle;
        let launchTime = 0.8;

        let rx = 0.1 + (fr + 0.2 + h1 * 0.6) / f32(NUM_ROCKETS) * 0.8;
        // Burst target: upper portion of screen (low y in WebGPU)
        let burstY = 0.1 + h3 * 0.35;

        if (phase < launchTime) {
            let progress = phase / launchTime;
            // Launch from bottom (y=1) toward burst target
            let ry = 1.0 - progress * (1.0 - burstY);
            let trailPos = vec2f(rx, ry);
            let diff = vec2f((uv.x - trailPos.x) * aspect, uv.y - trailPos.y);
            let d = length(diff);
            let glow = smoothstep(0.015, 0.002, d) * (0.6 + 0.4 * dark);
            let trailCol = mix(vec3f(1.0, 0.95, 0.8), vec3f(1.0, 0.85, 0.5), progress);
            col += trailCol * glow;
        } else {
            let burstPhase = (phase - launchTime) / (cycle - launchTime);
            let burstCenter = vec2f(rx, burstY);

            let hueBase = h1 * 6.2832;

            for (var s = 0; s < 60; s++) {
                if (s >= SPARKS) { break; }
                let fs = f32(s);
                let sh1 = hash(fr * 100.0 + fs);
                let sh2 = hash(fr * 100.0 + fs + 0.5);
                let angle = sh1 * 6.2832;
                let speed = 0.15 + sh2 * 0.25;

                let age = burstPhase;
                let sx = burstCenter.x + cos(angle) * speed * age;
                // sin component + gravity (positive = downward in WebGPU)
                let sy = burstCenter.y - sin(angle) * speed * age + 0.3 * age * age;

                let sparkPos = vec2f(sx, sy);
                let diff = vec2f((uv.x - sparkPos.x) * aspect, uv.y - sparkPos.y);
                let d = length(diff);

                let fade = max(0.0, 1.0 - age * 1.2);
                let size = 0.004 * fade;
                let glow = smoothstep(size * 3.0, 0.0, d) * fade;

                let hue = hueBase + sh1 * 1.5;
                let sparkCol = vec3f(
                    0.5 + 0.5 * cos(hue),
                    0.5 + 0.5 * cos(hue + 2.094),
                    0.5 + 0.5 * cos(hue + 4.189)
                );
                col += sparkCol * glow * (0.5 + 0.5 * dark);
            }
        }
    }

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}

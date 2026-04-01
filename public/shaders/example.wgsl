@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f( -1.0,  -1.0), 
    vec2f(1.0, -1.0),  
    vec2f( -1.0, 1.0), 

    vec2f( -1.0,  1.0), 
    vec2f(1.0, -1.0),  
    vec2f( 1.0, 1.0) 
  );

  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

// Uniform Structure
struct Uniforms {
    iResolution: vec2f, // Screen resolution
    iTime: f32,         // Time
    iDarkmode: f32,
    iQuality: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Normalized pixel coordinates (from 0 to 1)
    let uv = fragCoord.xy / uniforms.iResolution;

    // Time varying pixel color
    let col = 0.5 + 0.5 * cos(uniforms.iTime + uv.xyx + vec3f(0.0, 2.0, 4.0));

    // Output to screen
    return vec4f(col, 1.0);
}

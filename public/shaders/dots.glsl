#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_darkmode;
uniform float u_quality;
out vec4 fragColor;

// gives the distance to a given line from a position p, 
float distanceToLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p-a;
    vec2 ba = b-a;
    float t = clamp(
        dot(pa, ba) / dot ( ba, ba), 0., 1.
    );

return length(pa - ba * t);
}

float fNoise(vec2 p) {
    p = fract(p * vec2(213.35, 495.19));
    p += dot(p, p + 348.93);
    return fract(p.x * p.y);
}

vec2 vec2Noise(vec2 p) {
    float n = fNoise(p);
    return vec2(n, fNoise(p + n));
}

vec2 getPointPosition(vec2 id, vec2 offset, float time) {
    vec2 noise = vec2Noise(id + offset) * time;    
    return offset + sin(noise) * .4;
}

float getline(vec2 p, vec2 a, vec2 b) {
    float d = distanceToLine(p, a, b);
    float m = smoothstep(0.03, 0.01, d);
    float d2 = length(a - b);
    
    
    m *= smoothstep(1.2, .8, d2) * 0.5 + smoothstep(0.05, 0.03, abs(d2 - 0.75));
    return m;
}

float layer(vec2 uv) {
    float m = 0.;
    
    // controls time component per layer
    float time = u_time * 0.2 + 20.;
    
    // fractional component of the uv
    vec2 gv = fract(uv) - 0.5;
    
    // integer value of the uv
    vec2 id = floor(uv);
    
    // array of 9, vec2's
    vec2 p[9];
    int i = 0;
    
    // create points for this layer
    for(float y = -1.; y <= 1.; y++) {
        for(float x = -1.; x <= 1.; x++) {
            p[i++] = getPointPosition(id, vec2(x, y), time);
        }
    }
    
    // draw lines, between layers    
    for(int i = 0; i < 9; i++) {
        m += getline(gv, p[4], p[i]);        
    }
    // correct lines when they are spanning over more then 1 tile.
    m += getline(gv, p[1], p[3]);
    m += getline(gv, p[1], p[5]);
    m += getline(gv, p[7], p[3]);
    m += getline(gv, p[7], p[5]);            
    
    // return m
    return m;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = (fragCoord - .5 * u_resolution.xy)/u_resolution.y;      
    vec2 mouse = vec2(0.0);
    float m = 0.0;
    
    // controls movement of layers close and far
    float time = u_time * 0.03;
    
    // rotation
    float s = sin(time);
    float c = cos(time);
    mat2 rot = mat2(c, -s, s, c);
    
    // rotate on the uv
    uv *= rot;
    mouse *= rot * 0.5;
    
    // add layers
    for(float i = 0.0; i <= 1.0; i += mix(0.4, 0.2, u_quality)) {
        float z = fract(i + time);//layer(uv * 8)
        float size = mix(10.0, 0.5, z);
        
        // first smoothstep is for fading in, other for fading out
        float fade = smoothstep(0.0, 0.5, z) * smoothstep(1.0, 0.8, z);
        m += layer(uv * size + i * 15. + mouse) * fade;
    }
    
    float brightLevel = (u_darkmode - 0.2) / (1.0 - 0.2);
    vec3 darkColor = mix(vec3(0.), vec3(0.3), vec3(m));  // Dark mode color
    vec3 whiteColor = abs(vec3(1.) - darkColor);  // White mode color

    // Smoothly interpolate between the two based on u_darkmode
    vec3 col = mix(darkColor, whiteColor, brightLevel);


    // Output to screen
    fragColor = vec4(col,1.0);
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
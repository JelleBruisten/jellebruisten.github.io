#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

vec3 hash33(vec3 p)
{
    p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
              dot(p,vec3(269.5,183.3,246.1)),
              dot(p,vec3(113.5,271.9,124.6)));

    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float tetraNoise(vec2 o) // Perlin(ish) Noise Function adapted from Stefan Gustavson's 'Simplex Noise Demystified' (Math)
{
    vec3 p = vec3(o.x + 0.008*u_time, o.y + 0.004*u_time,0.005*u_time);
    vec3 i = floor(p + dot(p, vec3(0.33333,0.33333,0.33333)));
    p -= i - dot(i, vec3(0.16666,0.16666,0.16666));
    
    vec3 i1 = step(p.yzx, p);
    vec3 i2 = max(i1, 1.0-i1.zxy);
    i1 = min(i1, 1.0-i1.zxy);
    vec3 p1 = p - i1 + 0.16666, 
         p2 = p - i2 + 0.33333, 
         p3 = p - 0.5;
    vec4 v = max(0.5 - vec4(dot(p,p), dot(p1,p1), dot(p2,p2), dot(p3,p3)), 0.0);
    vec4 d = vec4(dot(p, hash33(i)), dot(p1, hash33(i + i1)), dot(p2, hash33(i + i2)), dot(p3, hash33(i + 1.0)));
    float n = clamp(dot(d,v*v*v*8.)*1.732 + 0.5, 0., 1.);
    return n;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) //Meta-structure adapted from Shane - https://www.shadertoy.com/view/ldscWH (Thank you!)
{
    vec2 p =  (fragCoord.xy*2.5 - u_resolution.xy) / 
              (u_resolution.y/2.0 + u_resolution.x/2.0);// Convert Coords
    float f = sin(32.*tetraNoise(p));
    float weight =  clamp( 1.5-.5*abs(f)/fwidth(f),0.,1.);

    float darkness = clamp(1.0 - (u_darkmode - 0.2) / 0.8, 0.0, 1.0);
    vec3 bgDark    = vec3(0.01,  0.02,  0.06);
    vec3 bgLight   = vec3(0.93,  0.94,  0.96);
    vec3 lineDark  = vec3(0.10,  0.14,  0.28);
    vec3 lineLight = vec3(0.48,  0.52,  0.68);
    vec3 bg   = mix(bgLight,   bgDark,   darkness);
    vec3 line = mix(lineLight, lineDark, darkness);
    fragColor = vec4(mix(bg, line, weight), 1.0);
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}
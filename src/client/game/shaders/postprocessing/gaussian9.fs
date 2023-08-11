#version 300 es

precision highp float;

// Textures
uniform sampler2D color;
    // TODO shader define this for more perf
uniform vec2 direction;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

// Output fragment color.
void main() {
    vec4 colour = vec4(0.);
    vec2 offset = vec2(1.384615) * direction;
    vec2 offset2 = vec2(3.230769) * direction;
    colour += texture(color, vUv) * 0.22702702702702703;
    colour += texture(color, vUv + offset) * 0.31621621621621623;
    colour += texture(color, vUv - offset) * 0.31621621621621623;
    colour += texture(color, vUv + offset2) * 0.07027027027027027;
    colour += texture(color, vUv - offset2) * 0.07027027027027027;
    outColor = colour;
}

#version 300 es

precision highp float;

// Textures
uniform sampler2D color;
uniform vec2 colorSize;
    // TODO shader define this for more perf
uniform vec2 direction;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    vec4 colour = vec4(0.);
    vec2 offset = vec2(1.3333333) * direction;
    colour += texture(color, vUv) * 0.29411764705882354;
    colour += texture(color, vUv + (offset / colorSize)) * 0.35294117647058826;
    colour += texture(color, vUv - (offset / colorSize)) * 0.35294117647058826;
    outColor = colour;
}

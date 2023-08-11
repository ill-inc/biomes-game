#version 300 es

precision highp float;

// Textures
uniform sampler2D color;
uniform vec2 colorSize;
    // TODO shader define this for more perf
uniform vec2 direction;
in vec2 vUv;

// Output fragment color.
layout (location = 0) out vec4 outColor;

void main() {
    vec4 colour = vec4(0.);
    float width2 = 1.0;
    vec2 offset = vec2(1.411765) * direction;
    vec2 offset2 = vec2(3.294118) * direction;
    vec2 offset3 = vec2(5.176471) * direction;
    colour += texture(color, vUv) * 0.1964825501511404;
    colour += texture(color, vUv + (offset / colorSize)) * 0.2969069646728344;
    colour += texture(color, vUv - (offset / colorSize)) * 0.2969069646728344;
    colour += texture(color, vUv + (offset2 / colorSize)) * 0.09447039785044732;
    colour += texture(color, vUv - (offset2 / colorSize)) * 0.09447039785044732;
    colour += texture(color, vUv + (offset3 / colorSize)) * 0.010381362401148057;
    colour += texture(color, vUv - (offset3 / colorSize)) * 0.010381362401148057;
    outColor = colour;
}

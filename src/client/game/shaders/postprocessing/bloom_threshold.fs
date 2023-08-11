#version 300 es

precision highp float;

// Textures
uniform sampler2D color;
uniform float threshold;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    vec3 color = texture(color, vUv).rgb;
    outColor = vec4(max(color - vec3(threshold), vec3(0.0)), 1.0);
}

#version 300 es

precision highp float;

#include "src/client/game/shaders/colors.glsl"

uniform sampler2D color;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

// Applies both tonemapping and linear->srgb conversion.
void main() {
    outColor = applyBiomesColorCorrection(texture(color, vUv));
}

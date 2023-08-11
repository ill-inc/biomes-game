#version 300 es

precision highp float;

#include "packing.glsl"

uniform sampler2D depth;
uniform float cameraNear;
uniform float cameraFar;
uniform sampler2D debug;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    float depth = texture(depth, vUv).r;
    float viewZ = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    float scaledDepth = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
    outColor.rgb = vec3(1.0 - scaledDepth);
    outColor.a = 1.0;
}

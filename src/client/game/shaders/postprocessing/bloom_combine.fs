#version 300 es

precision highp float;

// Textures
uniform sampler2D color;
uniform sampler2D bloomIntermediate;

uniform float bloomIntensity;

in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    vec4 colorVal = texture(color, vUv);
    vec3 bloom = texture(bloomIntermediate, vUv).rgb;
    outColor = vec4(colorVal.rgb + bloom * bloomIntensity, colorVal.a);
}

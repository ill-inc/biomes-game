#version 300 es

precision highp float;

// Textures
uniform sampler2D bloomIntermediate;
uniform vec2 offset;
uniform float width;

in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    vec4 color = vec4(0.);
    vec2 scaledOffset = offset * 1.0;//* width;

    color += texture(bloomIntermediate, vUv - scaledOffset);
    color += texture(bloomIntermediate, vUv + vec2(scaledOffset.x, -scaledOffset.y));
    color += texture(bloomIntermediate, vUv + vec2(-scaledOffset.x, scaledOffset.y));
    color += texture(bloomIntermediate, vUv + scaledOffset);
    outColor = color * 0.25;
}

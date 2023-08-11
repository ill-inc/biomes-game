#version 300 es

precision highp float;

uniform sampler2D tDiffuse;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

void main() {
    vec4 tex = texture(tDiffuse, vUv);
    outColor = vec4(pow(tex.rgb, vec3(1.0 / 2.2)), tex.a);
}

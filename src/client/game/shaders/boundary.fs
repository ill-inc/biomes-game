#version 300 es

precision highp float;

in vec2 _texCoord;

uniform sampler2D pattern;
uniform vec3 highlightColor;
uniform float depthFadeDistance;
uniform float depthFadePower;
uniform float depthFadeOpacity;

// Output fragment color.
layout (location = 0) out vec4 outColor;

void main() {
    vec4 patternColor = texture(pattern, _texCoord);
    float fragDepth = gl_FragCoord.z / gl_FragCoord.w;
    float fadeOpac = clamp(pow(1.0 - fragDepth / depthFadeDistance, depthFadePower) * (depthFadeOpacity + patternColor.a), 0.0, 1.0);
    outColor = vec4(highlightColor, fadeOpac);
}
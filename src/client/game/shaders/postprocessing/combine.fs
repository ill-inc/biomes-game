#version 300 es

precision highp float;

uniform sampler2D color;
uniform sampler2D secondaryColor;
uniform sampler2D translucency;
in vec2 vUv;

layout (location = 0) out vec4 outColor;

vec4 mix_colors(vec4 base, vec4 top) {
  return vec4(mix(base.rgb, top.rgb, top.a), max(base.a, top.a));
}

void main() {
  vec4 color = texture(color, vUv);
  vec4 secondaryColor = texture(secondaryColor, vUv);
  vec4 translucency = texture(translucency, vUv);

  outColor = mix_colors(mix_colors(color, translucency), secondaryColor);
}

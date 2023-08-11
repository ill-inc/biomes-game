#version 300 es

precision highp float;

// Interpolated vertex input.
in float _fog;

uniform float alpha;

// Output fragment color.
layout(location = 0) out vec4 outColor;

// named baseColor since color is also used as an attribute name,
// and this causes issues with some hardware
uniform vec4 baseColor;

void main() {
  // TODO can store this as a R texture or stencil instead of RGBA
  outColor.rgb = vec3(mix(alpha, 1.0, _fog));
  outColor.a = 1.0;
}

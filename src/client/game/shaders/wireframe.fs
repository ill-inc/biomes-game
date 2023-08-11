#version 300 es

precision highp float;

// Interpolated vertex input.
in float _fog;
in float _maxDist;

// Output fragment color.
layout(location = 0) out vec4 outColor;

// named baseColor since color is also used as an attribute name,
// and this causes issues with some hardware
uniform vec4 baseColor;
uniform vec4 highlightedColor;

void main() {
  // The idea is that _maxDist is the Chebyshev distance from the center of the
  // currently highlighted block to the point we are shading.
  // We highlight any points within the block (and a small margin).
  outColor = _maxDist < 0.51 ? highlightedColor : baseColor;

  // Fog translucent materials separately
  outColor.a *= 1.0 - _fog;
}

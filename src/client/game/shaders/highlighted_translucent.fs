#version 300 es

precision highp float;

// Interpolated vertex input.
in vec2 _texCoord;
in float _fog;
in vec4 _color;
in float _maxDist;

uniform bool vertexColors;
uniform sampler2D map;
uniform bool useMap;

// Output fragment color.
layout (location = 0) out vec4 outColor;

// named baseColor since color is also used as an attribute name,
// and this causes issues with some hardware
uniform vec4 baseColor;
uniform vec4 highlightedColor;

void main() {
  // The idea is that _maxDist is the Chebyshev distance from the center of the
  // currently highlighted block to the point we are shading.
  // We highlight any points within the block (and a small margin).
  vec4 texColor = _maxDist < 0.51 ? highlightedColor : baseColor;
  if (useMap) {
    texColor *= texture(map, _texCoord);
  }
  if (vertexColors) {
    texColor *= _color;
  }
  outColor = texColor;

  // Fog translucent materials separately
  outColor.a *= 1.0 - _fog;
}

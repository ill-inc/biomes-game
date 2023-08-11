#version 300 es

precision highp float;

#include "common.glsl"

uniform sampler2D baseDepth;
uniform float cameraNear;
uniform float cameraFar;
uniform float fogStart;
uniform float fogEnd;

uniform bool vertexColors;
uniform sampler2D map;
uniform bool useMap;
uniform vec2 viewportSize;

in vec2 _texCoord;
in vec4 _color;
in float _worldDepth;

// Output fragment color.
layout (location = 0) out vec4 outColor;

// named baseColor since color is also used as an attribute name,
// and this causes issues with some hardware
uniform vec4 baseColor;

void main() {
  vec4 texColor = baseColor;
  if (useMap) {
    texColor *= texture(map, _texCoord);
  }
  if (vertexColors) {
    texColor *= _color;
  }
  outColor = texColor;

  vec2 screenUv = gl_FragCoord.xy / viewportSize;
  float existingDepth = texture(baseDepth, screenUv).r;
  float existingFog = computeFog(existingDepth, fogStart, fogEnd);
  // If we are behind an object, then render with that object's fog opacity.
  // If we are in front of an object, render at full opacity.
  // If existing depth is 0, then there was no object rendered at all. render at full opacity
  float skyRender = step(existingDepth, 0.01);
  float inFront = step(_worldDepth, existingDepth);
  outColor.a *= max(skyRender, max(inFront, existingFog));
}

#version 300 es

#include "common.glsl"

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float fogStart;
uniform float fogEnd;

in vec3 position;

out float _fog;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  float worldDepth = length(viewPosition.xyz);
  _fog = computeFog(worldDepth, fogStart, fogEnd);
}

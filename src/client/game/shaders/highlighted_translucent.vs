#version 300 es

#include "common.glsl"

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

uniform float fogStart;
uniform float fogEnd;
uniform float normalOffset;

// Center of block that is highlighted
uniform vec3 highlightedPosition;

in vec3 position;
in vec4 color;
in vec3 normal;

// Match default ThreeJS UV/TexCoord name
in vec2 uv;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec4 _color;
out vec2 _texCoord;
out float _fog;
out float _maxDist;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position + normal * normalOffset, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  _color = color;
  _texCoord = uv;
  float worldDepth = length(viewPosition.xyz);
  _fog = computeFog(worldDepth, fogStart, fogEnd);
  vec4 pos = modelMatrix * vec4(position, 1.0);
  _maxDist = infNorm(pos.xyz - (highlightedPosition + vec3(0.5, 0.5, 0.5)));
}

#version 300 es

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in vec3 normal;

out float _depth;
out vec3 _modelPosition;
out vec4 _worldPos;
out vec3 _eye;
out vec2 _texCoord;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;

  _depth = length(viewPosition.xyz);
  _modelPosition = position;
  _worldPos = modelMatrix * vec4(position, 1.0);
  _eye = -normalize(viewPosition.xyz);

  vec3 tangent = normal.yzx;
  vec3 cotangent = cross(normal, normal.yzx);
  float u = dot(tangent, _worldPos.xyz);
  float v = dot(cotangent, _worldPos.xyz);
  _texCoord = vec2(u, v);
}

#version 300 es

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;
uniform mat4 normalMatrix;
uniform float timeScale;
uniform float time;

in vec3 position;
in vec3 normal;

out float _depth;
out vec3 _modelPosition;
out vec3 _normal;
out vec4 _worldPos;
out vec3 _eye;
out vec2 _texCoord;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  vec4 viewNormal = normalMatrix * vec4(normal, 0.0);
  _depth = length(viewPosition.xyz);
  _modelPosition = position;
  _normal = viewNormal.xyz;
  _worldPos = modelMatrix * vec4(position, 1.0);
  _eye = -normalize(viewPosition.xyz);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec3 tangent = normal.yzx;
  vec3 cotangent = cross(normal, normal.yzx);
  float u = dot(tangent, worldPos.xyz);
  float v = dot(cotangent, worldPos.xyz);
  _texCoord = vec2(u, v) + vec2(-time * timeScale, 0.0);
}

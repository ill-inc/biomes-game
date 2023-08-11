#version 300 es

// Constants.
const vec3 light = normalize(vec3(1.0, 1.0, 1.0));

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Vertex attributes.
in vec3 position;
in vec4 color;

// Match default ThreeJS UV/TexCoord name
in vec2 uv;

out vec4 _color;
out vec2 _texCoord;
out float _worldDepth;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen and clip to view frustuim
  gl_Position = projectionMatrix * viewPosition;
  gl_Position.z = min(gl_Position.z, gl_Position.w);

  _color = color;
  _texCoord = uv;
  _worldDepth = length(viewPosition.xyz);
}

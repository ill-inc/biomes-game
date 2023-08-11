#version 300 es

// Constants.
const vec3 light = normalize(vec3(1.0, 1.0, 1.0));
const vec3[6] normals = vec3[](vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1));

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;

// Vertex attributes.
in vec3 position;
in float direction;
in vec2 texCoord;
in float texIndex;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec3 _normal;
out vec2 _texCoord;
flat out int _direction;
flat out int _texIndex;
out vec3 _light;
out vec3 _eye;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _direction = int(direction);
  _texCoord = texCoord;
  _texIndex = int(texIndex);

  // Emit the view-dependent vertex attributes.
  _normal = normalize(normalMatrix * normals[_direction]);
  _light = normalize(normalMatrix * light);
  _eye = -normalize(viewPosition.xyz);
}

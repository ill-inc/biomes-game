#version 300 es

// Constants.
const vec3[6] normals = vec3[](vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1));

// Uniforms.
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 light;

// Vertex attributes.
in float direction;
in vec2 texCoord;
in vec3 position;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out float _depth;
out vec2 _texCoord;
out vec3 _up;
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
flat out uint _direction;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _direction = uint(direction);
  _texCoord = texCoord;

  // Emit the view-dependent vertex attributes.
  _normal = normalize(normalMatrix * normals[_direction]);
  _light = normalize(normalMatrix * light);
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
  _eye = -normalize(viewPosition.xyz);
  _depth = length(viewPosition.xyz);
}

#version 300 es

// Constants.
const vec3 light = normalize(vec3(0.2, 1.0, 0.2));
const vec3[6] normals = vec3[](vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1));

// Uniforms.
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Vertex attributes.
in float direction;
in vec2 texCoord;
in vec3 position;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec2 _texCoord;
out vec3 _blockCoord;
out vec3 _up;
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
flat out uint _direction;

vec2 texCoords(vec3 position, uint direction, vec2 uv) {
  float uShift = 0.001 * (1.0 - 2.0 * uv.s);
  float vShift = 0.001 * (1.0 - 2.0 * uv.t);
  switch(direction) {
    case 0u:
      return vec2(position.z + uShift, position.y + vShift);
    case 1u:
      return vec2(position.z - uShift, position.y + vShift);
    case 2u:
      return vec2(position.x + uShift, position.z + vShift);
    case 3u:
      return vec2(position.x - uShift, position.z + vShift);
    case 4u:
      return vec2(position.x - uShift, position.y + vShift);
    case 5u:
      return vec2(position.x + uShift, position.y + vShift);
    default:
      return vec2(0, 0);
  }
}

vec3 blockCoord(vec3 position, uint direction, vec2 uv) {
  float uShift = 0.001 * (1.0 - 2.0 * uv.s);
  float vShift = 0.001 * (1.0 - 2.0 * uv.t);
  switch(direction) {
    case 0u:
      return vec3(position.x + 0.001, position.y + vShift, position.z + uShift);
    case 1u:
      return vec3(position.x - 0.001, position.y + vShift, position.z - uShift);
    case 2u:
      return vec3(position.x + uShift, position.y + 0.001, position.z + vShift);
    case 3u:
      return vec3(position.x - uShift, position.y - 0.001, position.z + vShift);
    case 4u:
      return vec3(position.x - uShift, position.y + vShift, position.z + 0.001);
    case 5u:
      return vec3(position.x + uShift, position.y + vShift, position.z - 0.001);
    default:
      return vec3(0, 0, 0);
  }
}

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _direction = uint(direction);
  _blockCoord = blockCoord(position, _direction, texCoord);
  _texCoord = texCoords(position, _direction, texCoord);

  // Emit the view-dependent vertex attributes.
  _normal = normalize(normalMatrix * normals[_direction]);
  _light = normalize(normalMatrix * light);
  _eye = -normalize(viewPosition.xyz);
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
}

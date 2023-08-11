#version 300 es

// Constants.
const vec3 light = normalize(vec3(0.2, 1.0, 0.2));

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;

// Vertex attributes.
in vec3 position;
in vec3 normal;
in vec2 texCoord;
in float texIndex;
in float tensorIndex;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec2 _texCoord;
out vec3 _blockCoord;
out vec3 _up;
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
flat out int _texIndex;
flat out int _tensorIndex;

int getTensorIndex() {
  return int(floatBitsToUint(tensorIndex) >> 16u) & 0xffff;
}

vec3 getBlockCoord(vec3 pos) {
  int denseIndex = floatBitsToInt(tensorIndex) & 0xffff;
  vec3 densePos = vec3(denseIndex & 0x1f, denseIndex >> 10, (denseIndex >> 5) & 0x1f);
  return pos - densePos;
}

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _texCoord = texCoord;
  _texIndex = int(texIndex);
  _tensorIndex = getTensorIndex();
  _blockCoord = getBlockCoord(position);

  // Emit the view-dependent vertex attributes.
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
  _eye = -normalize(viewPosition.xyz);
  _light = normalize(normalMatrix * light);
  _normal = normalize(normalMatrix * normal);
}

#version 300 es

#include "lighting.glsl"
#include "terrain.glsl"

// Constants.
uniform vec3 light;
const vec3[6] normals = vec3[](vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1));
const vec3[6] tangents = vec3[](vec3(0, 0, 1), vec3(0, 0, -1), vec3(0, 0, -1), vec3(0, 0, 1), vec3(-1, 0, 0), vec3(1, 0, 0));
const vec3[6] cotangents = vec3[](vec3(0, 1, 0), vec3(0, 1, 0), vec3(1, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 1, 0));

// Uniforms.
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 origin;
uniform float time;

uniform highp usampler2D materialData;
uniform highp usampler2D materialRank;

// Vertex attributes.
in float direction;
in vec2 texCoord;
in vec3 position;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out float _time;
out float _distance;
out vec2 _texCoord;
out vec3 _blockCoord;
out vec3 _up;
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
out vec3 _tangent;
out vec3 _cotangent;
out float _muckiness;
// Water reflection params.
out vec4 _incomingRay;
out mat4 _projectionMatrix;

WaterMaterialProperties getMaterialProperties(uvec3 blockCoord) {
  uint rank = getRank(materialRank, blockCoord);
  return getWaterMaterialProperties(materialData, rank);
}

vec2 texCoords(vec3 position, uint direction, vec2 uv) {
  float uShift = 0.001 * (1.0 - 2.0 * uv.s);
  float vShift = 0.001 * (1.0 - 2.0 * uv.t);
  switch (direction) {
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
  switch (direction) {
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

float getDepthOffset(float depth) {
  return mix(1e-5, 1e-4, depth / 32.0);
}

void main() {
  uint dir = uint(direction);
  vec3 pos = origin + position;
  vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;
  gl_Position.z += getDepthOffset(-viewPosition.z);

  // Forward view-independent vertex attributes.
  _time = time;
  _distance = length(viewPosition.xyz);
  _blockCoord = blockCoord(position, dir, texCoord);
  _texCoord = texCoords(pos, dir, texCoord);

  // Figure out what normals to use for the fragment shader.
  // NOTE: We always assume the up-facing direction because water is funny.
  vec3 normal = normals[3];
  vec3 tangent = tangents[3];
  vec3 cotangent = cotangents[3];

  // Emit the view-dependent vertex attributes.
  _normal = normalize(normalMatrix * normal);
  _tangent = normalize(normalMatrix * tangent);
  _cotangent = normalize(normalMatrix * cotangent);
  _light = normalize(normalMatrix * light);
  _eye = -viewPosition.xyz;
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));

  _incomingRay = viewPosition;
  _projectionMatrix = projectionMatrix;
  _muckiness = float(getMaterialProperties(uvec3(_blockCoord)).muck);
}

#version 300 es

#include "common.glsl"
#include "random.glsl"
#include "terrain.glsl"

// Uniforms.
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform vec3 light;
uniform vec3 origin;

// Material uniforms.
uniform highp usampler2D materialData;

// Vertex attributes.
in vec2 texCoord;
in vec3 normal;
in vec3 position;
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
flat out uint _tensorIndex;
flat out FloraMaterialProperties _props;

// START WIND STUFF *****

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float permute(float x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt(float r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4(float j, vec4 ip) {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p, s;

  p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;

  return p;
}

// Faster, but lower quality implementation of flora wind.
#if defined(SIMPLE_SIN_WIND)

vec3 windOffset(vec3 pos) {
  float w = time * 0.25;
  float posSum = pos.x + pos.y + pos.z;
  // Add some variation to how fast leaves wave around.
  float speedOffset = sin(w * 2.0 + posSum);
  return 0.1 * sin(w + speedOffset + posSum * 100.0 + pos);
}

#else

float snoise(vec4 v) {
  const float F4 = 0.309016994374947451;  // (sqrt(5) - 1)/4
  const vec4 C = vec4(0.138196601125011  /* (5 - sqrt(5))/20  G4 */, 0.276393202250021  /* 2 * G4 */, 0.414589803375032  /* 3 * G4 */, -0.447213595499958 /* -1 + 4 * G4 */);

  // First corner
  vec4 i = floor(v + dot(v, vec4(F4)));
  vec4 x0 = v - i + dot(i, C.xxxx);

  // Other corners
  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp(i0, 0.0, 1.0);
  vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
  vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);

  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

  // Permutations
  i = mod289(i);
  float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute(permute(permute(permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4(i1.z, i2.z, i3.z, 1.0)) + i.y + vec4(i1.y, i2.y, i3.y, 1.0)) + i.x + vec4(i1.x, i2.x, i3.x, 1.0));

  // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);

  vec4 p0 = grad4(j0, ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4, p4));

  // Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * (dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2))) + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4))));
}

vec3 windOffset(vec3 pos) {
  float w = 0.2 * time;
  return 0.1 * vec3(snoise(vec4(pos, w)), snoise(vec4(pos, w + 100.0)), snoise(vec4(pos, w + 200.0)));
}

#endif

vec3 applyWind(vec3 pos) {
  return windOffset(pos) + pos;
}

// Reduces the wind effect as a function of height^2
vec3 applyDampedWind(vec3 pos, float height) {
  vec3 offset = windOffset(pos);
  float clampedHeight = clamp(height, 0.0, 1.0);
  return pos + mix(vec3(0.0), offset, clampedHeight * clampedHeight);
}

// END WIND STUFF *****

int getTensorIndex() {
  return int(floatBitsToUint(tensorIndex) >> 16u) & 0xffff;
}

vec3 densePos() {
  int denseIndex = floatBitsToInt(tensorIndex) & 0xffff;
  return vec3(denseIndex & 0x1f, denseIndex >> 10, (denseIndex >> 5) & 0x1f);
}

vec3 getBlockCoord(vec3 pos) {
  return pos - densePos();
}

void main() {
  // Init random state
  rng_state = positionHash(uvec3(densePos()));

  // Get the material properties for this vertex.
  uint tensorIndex = uint(getTensorIndex());
  FloraMaterialProperties props = getFloraMaterialProperties(materialData, tensorIndex);

  // Apply a rotation
  vec3 blockCoord = getBlockCoord(position);
  vec3 originPos = blockCoord - vec3(0.5);
  mat3 rotation = ID;
  if (props.rotationType == 1u) {
    // Random Yaw
    rotation = rotationXZ(randomRange(0.0, 2.0 * PI));
  } else if (props.rotationType == 2u) {
    // Random Rotation
    rotation = randomRotation3d();
  }
  vec3 rotatedPosition = rotation * originPos;

  vec3 shiftedPosition = rotatedPosition + vec3(0.5) + densePos() + origin;

  // Animate the position with wind
  vec3 animatedPosition = shiftedPosition;
  if (props.windType == 1u) {
    // Flower Wind
    animatedPosition = applyDampedWind(animatedPosition, getBlockCoord(shiftedPosition - origin).y);
  } else if (props.windType == 2u) {
    // Leaf Wind
    animatedPosition = applyWind(animatedPosition);
  }

  vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _texCoord = texCoord;
  _texIndex = int(texIndex);
  _tensorIndex = tensorIndex;
  _blockCoord = getBlockCoord(animatedPosition - origin);
  _props = props;

  // Emit the view-dependent vertex attributes.
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
  _eye = -normalize(viewPosition.xyz);
  _light = normalize(normalMatrix * light);
  _normal = normalize(normalMatrix * normal);
}

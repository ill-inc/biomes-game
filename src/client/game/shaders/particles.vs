#version 300 es
// Camera uniforms
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Other uniforms
uniform vec2 baseAlphaRange;
uniform float fadeAfterRelativeLifespan;

uniform float relativeTime;
uniform float systemPauseTime;
uniform vec2 birthTimeRange;
uniform vec2 lifespanRange;
uniform vec2 angleVelocityRange;
uniform vec3 velocityRangeStart;
uniform vec3 velocityRangeEnd;
uniform vec3 acceleration;
uniform vec2 sizeRange;
uniform uint sampleIndex[32];
uniform uint numSampleIndex;
uniform float seed;

// For block textures
uniform vec3 light;
uniform vec3 spawnAABBStart;
uniform vec3 spawnAABBEnd;
uniform highp usampler2D textureIndex;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
out mat3 _texTransform;
out vec2 _texCoord;
out vec3 _up;
flat out uint _texIndex;

out float _alpha;

// Constants affecting buffer sampling logic.
const vec3 deadPos = vec3(1.0 / 0.0, 1.0 / 0.0, 1.0 / 0.0);
const uint kBufferWidth = 2048u;
const uint kDirCount = 6u;

vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

uint readBuffer(in highp usampler2D buffer, uint index) {
  ivec2 uv = ivec2(index % kBufferWidth, index / kBufferWidth);
  return texelFetch(buffer, uv, 0).r;
}

uint getTextureIndex(uint sampleIndex, uint direction) {
  return readBuffer(textureIndex, kDirCount * sampleIndex + direction);
}

mat3 rotation2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);

  return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

const vec2 xyPos[6] = vec2[](vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(-1.0, -1.0), vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0));

void main() {
  uint particleIndex = uint(gl_VertexID / 6);
  vec2 xyPos = xyPos[gl_VertexID % 6];

  float randomBase = float(particleIndex) + 1.0;

  // Birth rate randomized
  vec3 lifespanRandom = hash31((seed + 1.0) * randomBase);
  float birthTime = mix(birthTimeRange.x, birthTimeRange.y, lifespanRandom.x);
  float lifeSpan = mix(lifespanRange.x, lifespanRange.y, lifespanRandom.y);
  float loops = (relativeTime - birthTime) / lifeSpan;

  vec3 parameterRandom = hash31(lifespanRandom.x * floor(loops + 2.0) * randomBase);
  vec3 parameterRandom2 = hash31(lifespanRandom.y * floor(loops + 2.0) * randomBase);
  vec3 parameterRandom3 = hash31(lifespanRandom.z * floor(loops + 2.0) * randomBase);
  vec3 parameterRandom4 = hash31(parameterRandom3.x * floor(loops + 2.0) * randomBase);

  // Using random
  uint sampleIndexOffset = uint(mod(floor(lifespanRandom.z * float(numSampleIndex)), float(numSampleIndex)));
  _texIndex = getTextureIndex(sampleIndex[sampleIndexOffset], 4u);

  vec3 velocity = mix(velocityRangeStart, velocityRangeEnd, parameterRandom);
  float angleVelocity = mix(angleVelocityRange.x, angleVelocityRange.y, parameterRandom2.x);

  vec3 startPos = mix(spawnAABBStart, spawnAABBEnd, parameterRandom3);
  float particleSize = mix(sizeRange.x, sizeRange.y, parameterRandom4.x);
  float baseAlpha = mix(baseAlphaRange.x, baseAlphaRange.y, parameterRandom4.y);

  // Derived
  float pauseTimeAge = mod(systemPauseTime - birthTime, lifeSpan);
  float age = mod(relativeTime - birthTime, lifeSpan);
  float relativeAge = age / lifeSpan;
  float fadeAlpha = min((1.0 - relativeAge) / (1.0 - fadeAfterRelativeLifespan), 1.0);

  _alpha = baseAlpha * fadeAlpha;

  if (relativeTime <= birthTime ||
    (relativeTime >= systemPauseTime - pauseTimeAge + lifeSpan)) {
    gl_Position = vec4(deadPos, 1.0);
  } else {
    vec3 relativePos = 0.5 * acceleration * age * age + velocity * age + startPos;
    float angle = angleVelocity * age;

    vec3 rotPosition = rotation2d(angle) * vec3(particleSize * xyPos / 2.0, 1.0);

    vec4 viewPosition = modelViewMatrix * vec4(relativePos, 1.0) +
      vec4(rotPosition.xy, 0.0, 0.0);
    // Set the vertex position on the screen.
    gl_Position = projectionMatrix * viewPosition;

    // Emit the view-dependent vertex attributes.
    _normal = normalize(-viewPosition.xyz);
    _light = normalize(normalMatrix * light);
    _eye = -normalize(viewPosition.xyz);
    _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
    _texCoord = (xyPos + 1.0) / 2.0;
  }
}
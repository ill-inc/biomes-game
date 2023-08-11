#version 300 es

#include "random.glsl"

// Camera uniforms
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Parameters
uniform vec3 sunDirection;
uniform float time;
uniform float radius;
uniform float sporeSizeMin;
uniform float sporeSizeMax;
uniform float angularSpeedMin;
uniform float angularSpeedMax;
uniform vec3 velocityMin;
uniform vec3 velocityMax;
uniform vec3 playerPosition;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec3 _sunDirection;
out vec2 _texCoord;
out vec3 _up;
out vec3 _normal;
flat out uint _index;

// wikipedia: rotation matrices
mat3 rotation3d(vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float ux = axis.x;
  float uy = axis.y;
  float uz = axis.z;
  return mat3( //
  c + ux * ux * (1.0 - c), ux * uy * (1.0 - c) - uz * s, ux * uz * (1.0 - c) + uy * s, //
  uy * ux * (1.0 - c) + uz * s, c + uy * uy * (1.0 - c), uy * uz * (1.0 - c) - ux * s, //
  uz * ux * (1.0 - c) - uy * s, uz * uy * (1.0 - c) + ux * s, c + uz * uz * (1.0 - c) //
  );
}

const vec2 xyPos[6] = vec2[](vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(-1.0, -1.0), vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0));

void main() {
  uint particleIndex = uint(gl_VertexID / 6);
  vec2 xyPos = xyPos[gl_VertexID % 6];

  rng_state = uint(particleIndex) + 1u;

  // Determine a random position in [0, width]^3 for the spore
  float width = 2.0 * radius;
  vec3 velocity = randomRange(velocityMin, velocityMax);
  vec3 initialPosition = randomRange(vec3(0.0), vec3(width)) + velocity * time;

  // Wrap [0, width]^3 to be centered around the player
  vec3 wrappedPosition = ceil((playerPosition - initialPosition) / width) * width + initialPosition - vec3(radius);

  // Perform a single initial rotation and then rotate around a random axis at a constant rate.
  vec3 rotationAxis = randomAxis();
  mat3 initialRotation = randomRotation3d();
  float angularSpeed = randomRange(angularSpeedMin, angularSpeedMax);
  float angle = time * angularSpeed;
  mat3 rotationMatrix = rotation3d(rotationAxis, angle);
  float sporeSize = randomRange(sporeSizeMin, sporeSizeMax);
  vec3 rotatedPosition = rotationMatrix * initialRotation * vec3(sporeSize * xyPos, 0.0);

  vec4 viewPosition = modelViewMatrix * vec4(rotatedPosition + wrappedPosition, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Emit the view-dependent vertex attributes.
  _sunDirection = normalize(normalMatrix * sunDirection);
  _up = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
  _normal = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 1.0)).xyz);
  _texCoord = (xyPos + 1.0) / 2.0;
  _index = particleIndex;
}
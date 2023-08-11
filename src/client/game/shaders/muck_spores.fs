#version 300 es

precision highp float;

#include "random.glsl"

uniform sampler2D spriteMap;
uniform uint sporeCount;
uniform float alphaMin;
uniform float alphaMax;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _sunDirection;
in vec3 _up;
in vec3 _normal;
flat in uint _index;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec3 outNormal;
layout (location = 2) out float outBaseDepth;

// Properties
const vec3 matAmbient = vec3(1.0);
const vec3 nightAmbient = vec3(0.1, 0.1, 0.2);
const vec3 lightAmbient = vec3(1.0);

vec3 getDiffuseComponent(vec3 up, vec3 sunDirection) {
  float presence = dot(sunDirection, up);
  vec3 diffuse = clamp(lightAmbient * matAmbient * presence, 0.0, 1.0);
  return max(diffuse, nightAmbient);
}

void main() {
  rng_state = _index + 1u;

  if (_index >= sporeCount) {
    discard;
  }

  float alpha = randomRange(alphaMin, alphaMax);

  vec4 baseColor = texture(spriteMap, _texCoord);
  vec3 litColor = baseColor.xyz * getDiffuseComponent(_up, _sunDirection);
  outColor = vec4(litColor, alpha * baseColor.w);
  outNormal = normalize(_normal);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}
#version 300 es

precision highp float;

uniform lowp sampler2DArray colorMap;
uniform lowp sampler2DArray mreaMap;
uniform sampler2D spriteMap;
uniform float emissiveBoost;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
in mat3 _texTransform;
in vec3 _up;
in float _alpha;

flat in uint _texIndex;

#include "common.glsl"

// Material properties.
const vec3 matAmbient = vec3(1.0);

// Light properties.
const vec3 nightAmbient = vec3(0.1, 0.1, 0.2);
const vec3 lightAmbient = vec3(1.0);

// Render mode
uniform int displayRenderMode;
const int kDisplayRenderModeBlock = 0;
const int kDisplayRenderModeSprite = 1;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

vec3 getDiffuseComponent(vec3 up, vec3 light) {
  float presence = dot(light, up);
  vec3 diffuse = clamp(lightAmbient * matAmbient * presence, 0.0, 1.0);
  return max(diffuse, nightAmbient);
}

vec4 blockFragment() {
  vec3 colorUVW = vec3(_texCoord, float(_texIndex));
  vec4 mrea = texture(mreaMap, colorUVW).rgba;

  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1);
  float emissive = mrea.b + emissiveBoost;
  float texAo = mrea.a;

  vec3 baseColor = texture(colorMap, colorUVW).rgb;
  vec3 D = baseColor * getDiffuseComponent(_up, _light);
  vec3 E = emissive * baseColor * emissiveIntensity;
  vec3 litColor = D + E;

  return vec4(litColor, 1.0);
}

vec4 spriteFragment() {
  vec4 baseColor = texture(spriteMap, _texCoord);
  vec3 D = baseColor.xyz * getDiffuseComponent(_up, _light);
  vec3 E = baseColor.xyz * emissiveBoost * emissiveIntensity;
  vec3 litColor = D + E;
  return vec4(litColor, baseColor.w);
}

void main() {
  vec3 normal = normalize(_normal);
  vec4 baseColor;

  switch (displayRenderMode) {
    case kDisplayRenderModeSprite:
      baseColor = spriteFragment();
      break;

    default:
      baseColor = blockFragment();
      break;
  }

  outColor = vec4(baseColor.xyz, _alpha * baseColor.w);
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}
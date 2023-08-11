#version 300 es

precision highp float;
precision lowp sampler2DArray;

#include "common.glsl"

// Light properties.
const vec3 lightAmbient = defaultLightAmbient * 0.86;
const vec3 lightDiffuse = defaultLightDiffuse * 0.8;
const vec3 lightSpecular = defaultLightSpecular * 0.5;

const vec3 irradiance = vec3(1.0, 1.0, 1.0);
const float skyVisibility = 1.0;
const vec3 up = vec3(0.0, 1.0, 0.0);

// Texture uniforms.
uniform sampler2DArray colorMap;

#if defined(HAS_MREA)
uniform lowp sampler2DArray mreaMap;
BaseMaterialProperties getBaseMaterialProperties(vec3 texColor, vec3 colorUVW, vec3 normal) {
  vec4 mrea = texture(mreaMap, colorUVW).rgba;
  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1);
  float emissive = mrea.b;
  float texAo = mrea.a;
  return BaseMaterialProperties(texColor, metallic, roughness, texAo, emissive, normal, defaultMatAmbient, defaultMatDiffuse, defaultMatSpecular);
}
#else
BaseMaterialProperties getBaseMaterialProperties(vec3 texColor, vec3 colorUVW, vec3 normal) {
  return DiffuseBaseMaterialProperties(texColor, normal, defaultMatAmbient, defaultMatDiffuse, vec3(0));
}
#endif

// Interpolated vertex input.
in vec3 _normal;
in vec2 _texCoord;
flat in int _texIndex;
in vec3 _light;
in vec3 _eye;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

void main() {
  // Sample the color map.
  vec3 colorUVW = vec3(_texCoord, float(_texIndex));
  vec4 texColor = texture(colorMap, colorUVW);
  if (texColor.a == 0.0) {
    discard;
  }

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);

  // Use Base BRDF
  BaseMaterialProperties matProperties = getBaseMaterialProperties(texColor.rgb, colorUVW, normal);
  BaseSceneProperties sceneProperties = BaseSceneProperties(up, eye);
  BaseLight lightProperties = BaseLight(light, lightAmbient, defaultNightAmbient, lightDiffuse, lightSpecular);
  SpatialLighting spatial = SpatialLighting(irradiance, skyVisibility);
  vec3 litColor = baseBrdf(matProperties, sceneProperties, lightProperties, spatial);

  // Output the fragment color.
  outColor = vec4(litColor, texColor.a);
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

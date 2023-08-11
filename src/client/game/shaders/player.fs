#version 300 es

precision highp float;

#include "common.glsl"

const vec3 matAmbient = defaultMatAmbient * 0.7f;
const vec3 matDiffuse = defaultMatDiffuse * 1.3f;

// Interpolated vertex input.
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
in vec4 _color;

uniform vec2 spatialLighting;
uniform vec3 baseColor;
uniform float emissiveAdd;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

void main() {
  // Player meshes are driven solely by vertex colors
  vec3 texColor = _color.rgb * baseColor.rgb;
  // TODO mrea as vertex attributes alongside color
  vec4 mrea = vec4(0.0f, 0.9f, 0.0f, 1.0f);
  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1f);
  float emissive = mrea.b + emissiveAdd;
  float texAo = mrea.a;

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 up = normalize(_up);
  vec3 eye = normalize(_eye);

  // Use Base BRDF
  BaseMaterialProperties matProperties = BaseMaterialProperties(texColor, metallic, roughness, texAo, emissive, normal, matAmbient, matDiffuse, defaultMatSpecular);
  BaseSceneProperties sceneProperties = BaseSceneProperties(up, eye);
  BaseLight lightProperties = BaseLight(light, defaultLightAmbient, defaultNightAmbient, defaultLightDiffuse, defaultLightSpecular);
  SpatialLighting spatial = SpatialLighting(vec3(spatialLighting.x), spatialLighting.y);
  vec3 litColor = baseBrdf(matProperties, sceneProperties, lightProperties, spatial);

  outColor = vec4(litColor, 1.0f);
  outNormal = vec4(normal, 1.0f);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

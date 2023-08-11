#version 300 es

precision highp float;

#include "common.glsl"

const vec3 matAmbient = defaultMatAmbient * 0.7f;
const vec3 matDiffuse = defaultMatDiffuse * 1.3f;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _normal;
in vec4 _color;
in vec3 _light;

// named baseColor since color is also used as an attribute name,
// and this causes issues with some hardware
uniform vec3 baseColor;
uniform vec2 spatialLighting;
uniform bool vertexColors;
uniform sampler2D map;
uniform bool useMap;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

void main() {
  vec3 texColor = baseColor;
  if (useMap) {
    texColor *= texture(map, _texCoord).rgb;
  }
  if (vertexColors) {
    texColor *= _color.rgb;
  }
  vec4 mrea = vec4(0.0f, 0.9f, 0.0f, 1.0f);
  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1f);
  float emissive = mrea.b;
  float texAo = mrea.a;

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);
  vec3 up = normalize(_up);

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

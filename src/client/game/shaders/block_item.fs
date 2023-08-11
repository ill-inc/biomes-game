#version 300 es

precision highp float;

#include "common.glsl"

// Material properties.
const vec3 matAmbient = defaultMatAmbient * 0.4;
const vec3 matDiffuse = defaultMatDiffuse * 1.7;

// Texture uniforms.
uniform uint sampleIndex;
uniform highp usampler2D textureIndex;
uniform lowp sampler2DArray colorMap;
uniform lowp sampler2DArray mreaMap;

uniform vec2 spatialLighting;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
flat in uint _direction;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

// Constants affecting buffer sampling logic.
const uint kDirCount = 6u;

uint getTextureIndex() {
  return readBuffer(textureIndex, kDirCount * sampleIndex + _direction);
}

void main() {
  // Sample the color map.
  uint texIndex = getTextureIndex();
  vec3 colorUVW = vec3(mod(_texCoord, 1.0), float(texIndex));

  vec3 texColor = texture(colorMap, colorUVW).rgb;
  vec4 mrea = texture(mreaMap, colorUVW).rgba;
  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1);
  float emissive = mrea.b;
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

  outColor = vec4(litColor, 1.0);
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

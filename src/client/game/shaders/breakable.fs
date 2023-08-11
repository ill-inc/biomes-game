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
in vec3 _worldPos;
in vec3 _worldNormal;

uniform vec3 baseColor;
uniform vec2 spatialLighting;
uniform bool vertexColors;
uniform sampler2D map;
uniform bool useMap;

// Destroying / shaping block preview
uniform int destroyTextureFrame;
uniform lowp sampler2DArray destroyTexture;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

void main() {
  vec3 texColor = baseColor;
  if (useMap) {
    texColor *= texture(map, _texCoord).rgb;
    float alpha = texture(map, _texCoord).a;
    if (alpha < 0.5f) {
      discard;
    }
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

  vec3 baseColor = texColor;
  if (destroyTextureFrame >= 0) {
    // triplanar projection aligned to world-space grid
    // since we're mostly face aligned cubes, just cut a corner and lerp the coordinates
    // instead of the 3 full texture samples
    // if we start having diagonal or curved surfaces, lerp against a full texture sample
    // instead (at the cost of perf)
    vec2 xFaceCoord = mod(_worldPos.zy, 1.0f);
    vec2 zFaceCoord = mod(_worldPos.xy, 1.0f);
    vec2 yFaceCoord = mod(_worldPos.xz, 1.0f);
    vec3 worldNormal = normalize(_worldNormal);
    vec2 triplanarCoord = xFaceCoord * abs(worldNormal.x) + yFaceCoord * abs(worldNormal.y) + zFaceCoord * abs(worldNormal.z);
    vec4 destroyingColor = texture(destroyTexture, vec3(triplanarCoord, destroyTextureFrame));
    baseColor = blendHardLight(baseColor, destroyingColor.rgb, destroyingColor.a);
  }

  // Use Base BRDF
  BaseMaterialProperties matProperties = BaseMaterialProperties(baseColor, metallic, roughness, texAo, emissive, normal, matAmbient, matDiffuse, defaultMatSpecular);
  BaseSceneProperties sceneProperties = BaseSceneProperties(up, eye);
  BaseLight lightProperties = BaseLight(light, defaultLightAmbient, defaultNightAmbient, defaultLightDiffuse, defaultLightSpecular);
  SpatialLighting spatial = SpatialLighting(vec3(spatialLighting.x), spatialLighting.y);
  vec3 litColor = baseBrdf(matProperties, sceneProperties, lightProperties, spatial);

  outColor = vec4(litColor, 1.0f);
  outNormal = vec4(normal, 1.0f);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

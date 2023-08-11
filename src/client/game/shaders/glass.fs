#version 300 es

precision highp float;

#include "lighting.glsl"
#include "terrain.glsl"
#include "postprocessing/fog.glsl"

// Light properties.
const vec3 lightAmbient = defaultLightAmbient * 0.86;
const vec3 lightDiffuse = defaultLightDiffuse * 0.8;
const vec3 lightSpecular = defaultLightSpecular * 0.5;

// Material uniforms.
uniform highp usampler2D materialRank;
uniform highp usampler2D materialData;

// Lighting uniforms.
uniform highp usampler2D lightingRank;
uniform highp usampler2D lightingData;

// Texture uniforms.
uniform highp usampler2D textureIndex;
uniform lowp sampler2DArray colorMap;
uniform lowp sampler2DArray mreaMap;

// Destroying / shaping block preview
uniform int destroyTextureFrame;
uniform lowp sampler2DArray destroyTexture;
uniform vec3 destroyPos;
uniform int shapeTextureFrame;
uniform lowp sampler2DArray shapeTexture;
uniform vec3 shapePos;

// Sky
uniform vec3 sunDirection;
uniform vec3 sunColor;
uniform float skyGroundOffset;
uniform float skyHeightScale;

// Fog
uniform float fogStart;
uniform float fogEnd;

// Environment
uniform int inWater;
uniform float muckyness;

// Camera
uniform vec3 cameraPosition;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _blockCoord;
in vec3 _worldCoord;
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

uvec3 getBlockCoord() {
  ivec3 coord = ivec3(floor(_blockCoord));
  return uvec3((32 + (coord % 32)) % 32);
}

ivec3 getWorldCoord() {
  return ivec3(floor(_worldCoord));
}

uint getBlockRank() {
  return getRank(materialRank, getBlockCoord());
}

uint getTextureIndex() {
  uint rank = getBlockRank();
  uint material = readBuffer(materialData, rank * 2u);
  return readBuffer(textureIndex, kDirCount * material + _direction);
}

uint getLightRank() {
  return getRank(lightingRank, getBlockCoord());
}

void sampleVoxelLightComponents(out vec3 irr, out float sky) {
  uint rank = getLightRank();
  readVoxelLightComponents(lightingData, rank, _blockCoord, irr, sky);
}

vec3 combineShapeAndDestructionOverlay(vec3 colorUVW, vec3 baseColor) {
  vec3 ret = baseColor.rgb;
  // Force a round down; positions at x.5 should round to voxel at x.
  vec3 roundEpsilon = vec3(-0.01);
  if (destroyTextureFrame >= 0 && getWorldCoord() == ivec3(round(destroyPos + roundEpsilon))) {
    vec4 destroyingColor = texture(destroyTexture, vec3(colorUVW.xy, destroyTextureFrame));
    ret = blendHardLight(baseColor.rgb, destroyingColor.rgb, destroyingColor.a);
  }
  if (shapeTextureFrame >= 0 && getWorldCoord() == ivec3(round(shapePos + roundEpsilon))) {
    vec4 shapingColor = texture(shapeTexture, vec3(colorUVW.xy, shapeTextureFrame));
    ret = blendHardLight(baseColor.rgb, shapingColor.rgb, shapingColor.a);
  }
  return ret;
}

void main() {
  // Sample the color map.
  uint texIndex = getTextureIndex();
  vec3 colorUVW = vec3(mod(_texCoord, 1.0), float(texIndex));

  vec4 texColor = texture(colorMap, colorUVW).rgba;
  vec4 mrea = texture(mreaMap, colorUVW).rgba;
  float metallic = mrea.r;
  float roughness = max(mrea.g, 0.1);
  float emissive = mrea.b;
  float texAo = mrea.a;

  // Apply destruction texture
  texColor.rgb = combineShapeAndDestructionOverlay(colorUVW, texColor.rgb);

  // Sample the light map.
  vec3 irr = vec3(0.0);
  float sky = 0.0;
  sampleVoxelLightComponents(irr, sky);

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);
  vec3 up = normalize(_up);

  // Use Base BRDF
  BaseMaterialProperties matProperties = BaseMaterialProperties(texColor.rgb, metallic, roughness, texAo, emissive, normal, defaultMatAmbient, defaultMatDiffuse, defaultMatSpecular);
  BaseSceneProperties sceneProperties = BaseSceneProperties(up, eye);
  BaseLight lightProperties = BaseLight(light, lightAmbient, defaultNightAmbient, lightDiffuse, lightSpecular);
  SpatialLighting spatial = SpatialLighting(irr, sky);
  vec3 litColor = baseBrdf(matProperties, sceneProperties, lightProperties, spatial);

  // Output the fragment color.
  SkyParams skyParams = SkyParams(sunColor, sunDirection, skyGroundOffset, skyHeightScale);
  FogParams fog = FogParams(fogStart, fogEnd);
  EnvironmentParams env = EnvironmentParams(muckyness, inWater);
  vec3 relativePosition = _worldCoord - cameraPosition;
  outColor = blendFog(vec4(litColor, texColor.a), skyParams, fog, env, length(relativePosition));
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

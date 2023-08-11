#version 300 es

precision highp float;
precision lowp sampler2DArray;

#include "common.glsl"
#include "terrain.glsl"
#include "lighting.glsl"

// Material properties.
const vec3 matSpecular = vec3(0.0);

// Light properties.
const vec3 lightAmbient = defaultLightAmbient * 0.86;
const vec3 lightDiffuse = defaultLightDiffuse * 0.8;
const vec3 lightSpecular = defaultLightSpecular * 0.4;

// Texture uniforms.
uniform sampler2DArray colorMap;

// Lighting uniforms.
uniform highp usampler2D lightingData;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _blockCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
flat in int _texIndex;
flat in uint _tensorIndex;
flat in FloraMaterialProperties _props;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

uint getLightRank() {
  return _tensorIndex;
}

void sampleVoxelLightComponents(out vec3 irr, out float sky) {
  uint rank = getLightRank();
  readVoxelLightComponents(lightingData, rank, _blockCoord, irr, sky);
}

void main() {
  // Sample the color map.
  vec4 texColor = texture(colorMap, vec3(_texCoord, float(_texIndex)));
  if (texColor.a < 0.5) {
    discard;
  }

  // Compute component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 up = normalize(_up);
  vec3 eye = normalize(_eye);

  // Sample the light map.
  vec3 irr = vec3(0.0);
  float sky = 0.0;
  sampleVoxelLightComponents(irr, sky);

  // Use Base BRDF
  BaseMaterialProperties matProperties = DiffuseBaseMaterialProperties(texColor.rgb, normal, defaultMatAmbient, defaultMatDiffuse, matSpecular);
  BaseSceneProperties sceneProperties = BaseSceneProperties(up, eye);
  BaseLight lightProperties = BaseLight(light, lightAmbient, defaultNightAmbient, lightDiffuse, lightSpecular);
  SpatialLighting spatial = SpatialLighting(irr, sky);
  vec3 litColor = baseBrdf(matProperties, sceneProperties, lightProperties, spatial);

  // Output the fragment color.
  outColor = vec4(litColor, 1.0);

  if (bool(_props.isWilting)) {
    outColor.rgb = floraWiltingColor(outColor.rgb);
  }
  outColor.rgb = floraMuckColor(outColor.rgb, _props.muck);

  outNormal = vec4(normal, 1.0) * sign(dot(normal, _eye));
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

#if !defined(_SRC_CLIENT_GAME_SHADERS_LIGHTING_GLSL)
#define _SRC_CLIENT_GAME_SHADERS_LIGHTING_GLSL

#include "src/client/game/shaders/common.glsl"

float getLightIntensity(uint lightMask, uint x, uint y, uint z) {
  uint intensity = (lightMask >> ((x << 2u) | (y << 3u) | (z << 4u))) & 0xfu;
  return float(intensity) / 15.0;
}

float blendMask(uint mask, vec3 w) {
  float l_000 = getLightIntensity(mask, 0u, 0u, 0u);
  float l_100 = getLightIntensity(mask, 1u, 0u, 0u);
  float l_010 = getLightIntensity(mask, 0u, 1u, 0u);
  float l_110 = getLightIntensity(mask, 1u, 1u, 0u);
  float l_001 = getLightIntensity(mask, 0u, 0u, 1u);
  float l_101 = getLightIntensity(mask, 1u, 0u, 1u);
  float l_011 = getLightIntensity(mask, 0u, 1u, 1u);
  float l_111 = getLightIntensity(mask, 1u, 1u, 1u);

  // Interpolate along the x-direction.
  float l_00 = mix(l_000, l_100, w.x);
  float l_10 = mix(l_010, l_110, w.x);
  float l_01 = mix(l_001, l_101, w.x);
  float l_11 = mix(l_011, l_111, w.x);

  // Interpolate along the y-direction
  float l_0 = mix(l_00, l_10, w.y);
  float l_1 = mix(l_01, l_11, w.y);

  // Interpolote along the z-direction.
  return mix(l_0, l_1, w.z);
}

vec3 blendMask(uvec3 mask, vec3 w) {
  return vec3(blendMask(mask.x, w), blendMask(mask.y, w), blendMask(mask.z, w));
}

void readVoxelLightComponents(in highp usampler2D lightingData, uint rank, vec3 blockCoord, out vec3 irr, out float sky) {
  uint size = 4u;
  uint irrMaskR = readBuffer(lightingData, size * rank);
  uint irrMaskG = readBuffer(lightingData, size * rank + 1u);
  uint irrMaskB = readBuffer(lightingData, size * rank + 2u);
  uvec3 irrMask = uvec3(irrMaskR, irrMaskG, irrMaskB);
  uint skyMask = readBuffer(lightingData, size * rank + 3u);

    // Extract the lerp weighting for each direction.
  float x_w = easeInOut(mod(blockCoord.x, 1.0));
  float y_w = easeInOut(mod(blockCoord.y, 1.0));
  float z_w = easeInOut(mod(blockCoord.z, 1.0));
  vec3 w = vec3(x_w, y_w, z_w);

  irr = blendMask(irrMask, w);
  sky = blendMask(skyMask, w);
}

#endif  // _SRC_CLIENT_GAME_SHADERS_LIGHTING_GLSL
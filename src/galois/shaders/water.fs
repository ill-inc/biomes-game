#version 300 es

precision highp float;

// Material properties.
const vec3 matAmbient = vec3(1.0);
const vec3 matDiffuse = vec3(1.0);
const vec3 matSpecular = vec3(0.25);

// Light properties.
const vec3 nightAmbient = vec3(0.05, 0.05, 0.15);
const vec3 lightAmbient = vec3(0.6);
const vec3 lightDiffuse = vec3(0.8);
const vec3 lightSpecular = vec3(0.5);

// Lighting uniforms.
uniform highp usampler2D lightingRank;
uniform highp usampler2D lightingData;

// Interpolated vertex input.
in vec3 _blockCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

// Constants affecting buffer sampling logic.
const uint kBufferWidth = 2048u;

// A custom popcount, as the instrinsic requires WebGL >= 3.1.
// NOTE: LUT approaches seem to cause crazy warp divergence on some GPUs. As a
// work-around, we use a little bit trick here (see: tinyurl.com/46kndusm).
uint popcount(uint x) {
  uint ret = 0u;
  ret = x - ((x >> 1u) & 0x55555555u);
  ret = ((ret >> 2u) & 0x33333333u) + (ret & 0x33333333u);
  ret = ((ret >> 4u) + ret) & 0x0F0F0F0Fu;
  ret = ((ret >> 8u) + ret) & 0x00FF00FFu;
  ret = ((ret >> 16u) + ret) & 0x0000FFFFu;
  return ret;
}

uint onetrail(uint offset) {
  return (1u << offset) - 1u;
}

uint readBuffer(in highp usampler2D buffer, uint index) {
  ivec2 uv = ivec2(index % kBufferWidth, index / kBufferWidth);
  return texelFetch(buffer, uv, 0).r;
}

uint getRank(in highp usampler2D rankBuffer, uvec3 pos) {
  uint offset = 0u;
  uint mask = 0xffffffffu;

  uint y_cumsum = readBuffer(rankBuffer, offset);
  uint y_bucket = readBuffer(rankBuffer, offset + 1u);
  offset = y_cumsum + popcount(y_bucket & onetrail(mask & pos.y));
  offset <<= 1u;
  if ((y_bucket & (1u << pos.y)) == 0u) {
    mask = 0u;
  }

  uint z_cumsum = readBuffer(rankBuffer, offset);
  uint z_bucket = readBuffer(rankBuffer, offset + 1u);
  offset = z_cumsum + popcount(z_bucket & onetrail(mask & pos.z));
  offset <<= 1u;
  if ((z_bucket & (1u << pos.z)) == 0u) {
    mask = 0u;
  }

  uint x_cumsum = readBuffer(rankBuffer, offset);
  uint x_bucket = readBuffer(rankBuffer, offset + 1u);
  return x_cumsum + popcount(x_bucket & onetrail(mask & pos.x));
}

uvec3 getBlockCoord() {
  ivec3 coord = ivec3(floor(_blockCoord));
  return uvec3((32 + (coord % 32)) % 32);
}

uint getLightRank() {
  return getRank(lightingRank, getBlockCoord());
}

float getLightIntensity(uint lightMask, uint x, uint y, uint z) {
  uint intensity = (lightMask >> ((x << 2u) | (y << 3u) | (z << 4u))) & 0xfu;
  return float(intensity) / 15.0;
}

float easeIn(float t) {
  return t * t;
}

float easeOut(float t) {
  return 1.0 - easeIn(1.0 - t);
}

float easeInOut(float t) {
  return mix(easeIn(t), easeOut(t), t);
}

vec3 easeIn(vec3 t) {
  return t * t;
}

vec3 easeOut(vec3 t) {
  return vec3(1.0) - easeIn(vec3(1.0) - t);
}

vec3 easeInOut(vec3 t) {
  return mix(easeIn(t), easeOut(t), t);
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

void sampleVoxelLightComponents(out vec3 irradiance, out float skyOcclusion) {
  uint rank = getLightRank();

  uint size = 4u;
  uint irrMaskR = readBuffer(lightingData, size * rank);
  uint irrMaskG = readBuffer(lightingData, size * rank + 1u);
  uint irrMaskB = readBuffer(lightingData, size * rank + 2u);
  uvec3 irrMask = uvec3(irrMaskR, irrMaskG, irrMaskB);
  uint skyOcclusionMask = readBuffer(lightingData, size * rank + 3u);

  // Extract the lerp weighting for each direction.
  float x_w = easeInOut(mod(_blockCoord.x, 1.0));
  float y_w = easeInOut(mod(_blockCoord.y, 1.0));
  float z_w = easeInOut(mod(_blockCoord.z, 1.0));

  irradiance = blendMask(irrMask, vec3(x_w, y_w, z_w));
  skyOcclusion = blendMask(skyOcclusionMask, vec3(x_w, y_w, z_w));
}

float occlusionToLightFactor(float occlusion) {
  float intensity = 1.0 - occlusion;
  intensity = min(1.0, 2.2 * intensity);
  intensity = mix(intensity, easeIn(intensity), intensity);
  intensity += 0.01; // Lowerbound darkness (for now).
  return intensity;
}

vec3 irradianceToLightFactor(vec3 irradiance) {
  return easeInOut(min(vec3(1.0), 1.2 * irradiance));
}

vec3 getAmbientComponent(vec3 up, vec3 light) {
  float presence = dot(light, up);
  vec3 ambient = clamp(lightAmbient * matAmbient * presence, 0.0, 1.0);
  return max(ambient, nightAmbient);
}

vec3 getDiffuseComponent(vec3 up, vec3 normal, vec3 light) {
  float presence = clamp(dot(light, up), 0.0, 1.0);
  float intensity = presence * dot(normal, light);
  return clamp(lightDiffuse * matDiffuse * intensity, 0.0, 1.0);
}

vec3 getSpecularComponent(vec3 normal, vec3 camDir, vec3 lightDir) {
  return vec3(0.0);
}

void main() {
  // Sample the light map.
  vec3 irradiance = vec3(0.0);
  float skyOcclusion = 0.0;
  sampleVoxelLightComponents(irradiance, skyOcclusion);

  // Account for the texture's ambient occlusion in the final light discount factor.
  vec3 irrF = vec3(irradianceToLightFactor(irradiance));
  vec3 skyF = vec3(occlusionToLightFactor(skyOcclusion));

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);
  vec3 up = normalize(_up);

  vec3 baseColor = vec3(0.4, 0.5, 1.0);

  // Compute sky lighting components.
  vec3 A = skyF * baseColor * getAmbientComponent(up, light);
  vec3 D = skyF * baseColor * getDiffuseComponent(up, normal, light);
  vec3 S = skyF * baseColor * getSpecularComponent(normal, eye, light);
  vec3 I = baseColor * irrF;

  // Output the fragment color.
  vec3 litColor = A + D + S + I;
  outColor = vec4(litColor, 1.0);
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;

  // Gamma correction.
  outColor.rgb = pow(outColor.rgb, vec3(1.0 / 2.2));
  outColor.a = 0.6;
}

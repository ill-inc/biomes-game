#version 300 es

precision highp float;

// Material properties.
const vec3 matAmbient = vec3(1.0);
const vec3 matDiffuse = vec3(1.0);
const vec3 matSpecular = vec3(0.25);
const float emissiveIntensity = 10.;

// Light properties.
const vec3 nightAmbient = vec3(0.05, 0.05, 0.15);
const vec3 lightAmbient = vec3(0.6);
const vec3 lightDiffuse = vec3(0.8);
const vec3 lightSpecular = vec3(0.5);

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

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _blockCoord;
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
const uint kBufferWidth = 2048u;
const uint kDirCount = 6u;

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

uint getBlockRank() {
  return getRank(materialRank, getBlockCoord());
}

uint getTextureIndex() {
  uint rank = getBlockRank();
  uint material = readBuffer(materialData, rank);
  return readBuffer(textureIndex, kDirCount * material + _direction);
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

vec3 easeIn(vec3 t) {
  return t * t;
}

float easeOut(float t) {
  return 1.0 - easeIn(1.0 - t);
}

vec3 easeOut(vec3 t) {
  return vec3(1.0) - easeIn(vec3(1.0) - t);
}

float easeInOut(float t) {
  return mix(easeIn(t), easeOut(t), t);
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

  irradiance = vec3(blendMask(irrMask, vec3(x_w, y_w, z_w)));
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

// ggx from "microfacet models for refraction through rough surfaces" walter et.
// al 07
float ggx(float rough, vec3 normal, vec3 camDir, vec3 lightDir) {
  vec3 h = normalize(camDir + lightDir);
  float ndoth = clamp(dot(h, normal), 0.0, 1.0);
  float rough2 = rough * rough;
  float rough4 = rough2 * rough2;
  float d = (ndoth * rough4 - ndoth) * ndoth + 1.0;
  return rough4 / (3.14 * d * d);
}

vec3 getSpecularComponent(float rough, float metallic, vec3 normal, vec3 camDir, vec3 lightDir) {
  vec3 specular = lightSpecular * matSpecular;
  vec3 bGgx = ggx(rough, normal, camDir, lightDir) * specular;

  // stylized ambient rim fresnel-like light
  // this is to add some glints to non-reflective angles
  // if we start adding normal maps we will likely want to remove this
  float rf = 1.0 - dot(camDir, normal);
  float rf2 = rf * rf;
  float rf5 = rf2 * rf2 * rf;
  float revRough = 1.0 - rough;
  float rimScale = clamp((metallic + 0.3), 0.0, 1.0);
  vec3 rim = rf2 * specular * (revRough * revRough) * 12.0 * rimScale;
  bGgx *= clamp(1.0 - rimScale, 0.5, 2.0);

  return bGgx + rim;
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

  // Sample the light map.
  vec3 irradiance = vec3(0.0);
  float skyOcclusion = 0.0;
  sampleVoxelLightComponents(irradiance, skyOcclusion);

  // Account for the texture's ambient occlusion in the final light discount factor.
  vec3 irrF = texAo * irradianceToLightFactor(irradiance);
  vec3 skyF = texAo * vec3(occlusionToLightFactor(skyOcclusion));

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);
  vec3 up = normalize(_up);

  vec3 baseColor = texColor.rgb;
  vec3 diffuseColor = baseColor - baseColor * metallic * 0.5 - baseColor * roughness * 0.5;
  vec3 specularColor = mix(vec3(1.0 - roughness), baseColor, vec3(metallic));

  // Compute sky lighting components.
  vec3 A = skyF * baseColor * getAmbientComponent(up, light);
  vec3 D = skyF * diffuseColor * getDiffuseComponent(up, normal, light);
  vec3 S = skyF * specularColor * getSpecularComponent(roughness, metallic, normal, eye, light);
  vec3 E = emissive * baseColor * emissiveIntensity;
  vec3 I = baseColor * irrF;

  // Output the fragment color.
  vec3 litColor = A + D + S + E + I;
  outColor = vec4(litColor, 1.0);
  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;

  // Gamma correction.
  outColor.rgb = pow(outColor.rgb, vec3(1.0 / 2.2));
}

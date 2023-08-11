#version 300 es

precision highp float;
precision lowp sampler2DArray;

// Material properties.
const vec3 matAmbient = vec3(1.0);
const vec3 matDiffuse = vec3(1.0);
const vec3 matSpecular = vec3(0.0);
const float matShininess = 4.0;

// Light properties.
const vec3 nightAmbient = vec3(0.05, 0.05, 0.15);
const vec3 lightAmbient = vec3(0.6);
const vec3 lightDiffuse = vec3(0.8);
const vec3 lightSpecular = vec3(0.4);

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
flat in int _tensorIndex;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

// Constants affecting buffer sampling logic.
const uint kBufferWidth = 2048u;

uint readBuffer(in highp usampler2D buffer, uint index) {
  ivec2 uv = ivec2(index % kBufferWidth, index / kBufferWidth);
  return texelFetch(buffer, uv, 0).r;
}

float getLightIntensity(uint lightMask, uint x, uint y, uint z) {
  uint intensity = (lightMask >> ((x << 2u) | (y << 3u) | (z << 4u))) & 0xfu;
  return float(intensity) / 16.0;
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

void sampleVoxelLightComponents(out float skyOcclusion, out vec3 irradiance) {
  uint rank = uint(_tensorIndex);

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

vec3 occlusionToLightFactor(float occlusion) {
  float intensity = 1.0 - occlusion;
  intensity = min(1.0, 15.0 / 8.0 * intensity);
  intensity = mix(intensity, easeIn(intensity), intensity);
  intensity += 0.01; // Lowerbound darkness (for now).
  return vec3(intensity);
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

vec3 getSpecularComponent(vec3 normal, vec3 light, vec3 halfv) {
  vec3 specular = lightSpecular * matSpecular;
  return pow(max(0.0, dot(normal, halfv)), matShininess) * specular;
}

void main() {
  // Sample the color map.
  vec4 texColor = texture(colorMap, vec3(_texCoord, float(_texIndex)));
  if (texColor.a < 0.5) {
    discard;
  }

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 halfv = normalize(0.5 * (_eye + _light));
  vec3 up = normalize(_up);

  // Sample the light map.
  float skyOcclusion = 0.0f;
  vec3 irradiance = vec3(0.0);
  sampleVoxelLightComponents(skyOcclusion, irradiance);

  // Compute the light sky and irradiance light factors.
  vec3 skyF = occlusionToLightFactor(skyOcclusion);
  vec3 irrF = irradianceToLightFactor(irradiance);

  // Compute lighting components.
  vec3 A = skyF * getAmbientComponent(up, light);
  vec3 D = skyF * getDiffuseComponent(up, normal, light);
  vec3 S = skyF * getSpecularComponent(normal, light, halfv);
  vec3 I = irrF;

  // Output the fragment color.
  vec3 litColor = texColor.rgb * (A + D + I) + S;
  outColor = vec4(litColor, 1.0);
  outNormal = vec4(normal, 1.0) * sign(dot(normal, _eye));
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;

  // Gamma correction.
  outColor.rgb = pow(outColor.rgb, vec3(1.0 / 2.2));
}

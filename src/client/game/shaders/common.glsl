#if !defined(_SRC_CLIENT_GAME_SHADERS_COMMON_GLSL)
#define _SRC_CLIENT_GAME_SHADERS_COMMON_GLSL

precision highp int;

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

float normalizeSkyLightFactor(float intensity) {
  intensity = min(1.0, 2.2 * max(intensity, 0.0));
  intensity = mix(intensity, easeIn(intensity), intensity);
  intensity += 0.01; // Lowerbound darkness (for now).
  return intensity;
}

vec3 normalizeIrrLightFactor(vec3 intensity) {
  return easeInOut(min(vec3(1.0), 1.2 * intensity));
}

// ggx from "microfacet models for refraction through rough surfaces" walter et. al 07
float ggx(float rough, vec3 normal, vec3 camDir, vec3 lightDir) {
  vec3 h = normalize(camDir + lightDir);
  float ndoth = clamp(dot(h, normal), 0.0, 1.0);
  float rough2 = rough * rough;
  float rough4 = rough2 * rough2;
  float d = (ndoth * rough4 - ndoth) * ndoth + 1.0;
  return rough4 / (3.14 * d * d);
}

float blendOverlay(float base, float blend) {
  return base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  float r = blendOverlay(base.r, blend.r);
  float g = blendOverlay(base.g, blend.g);
  float b = blendOverlay(base.b, blend.b);
  return vec3(r, g, b);
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
  return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
}

vec3 blendHardLight(vec3 base, vec3 blend) {
  return blendOverlay(blend, base);
}

vec3 blendHardLight(vec3 base, vec3 blend, float opacity) {
  return (blendHardLight(base, blend) * opacity + base * (1.0 - opacity));
}

// Base material responses
float getBaseAmbientOcclusion() {
  return 1.0;
}

vec3 getBaseAmbientComponent(float presence, vec3 matAmbient, vec3 lightAmbient, vec3 nightAmbient) {
  vec3 ambient = clamp(lightAmbient * matAmbient * presence, 0.0, 1.0);
  return max(ambient, nightAmbient);
}

vec3 getBaseDiffuseComponent(float presence, vec3 normal, vec3 light, vec3 matDiffuse, vec3 lightDiffuse) {
  vec3 diffuse = lightDiffuse * matDiffuse;
  // Half lambert
  float falloff = dot(normal, light) * 0.5 + 0.5;
  return max(0.0, falloff * falloff) * diffuse * presence;
}

vec3 getBaseSpecularComponent(float presence, float rough, float metallic, vec3 normal, vec3 camDir, vec3 lightDir, vec3 lightSpecular, vec3 matSpecular) {
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

  return (bGgx + rim) * presence;
}

float infNorm(vec3 v) {
  return max(max(abs(v.x), abs(v.y)), abs(v.z));
}

struct BaseMaterialProperties {
  vec3 baseColor;
  float metallic;
  float roughness;
  float ao;
  float emissive;
  vec3 normal;
  // Lobe-specific overrides.
  // TODO: Remove these and move more towards PBR responses
  vec3 matAmbient;
  vec3 matDiffuse;
  vec3 matSpecular;
};

struct BaseSceneProperties {
  vec3 up;
  vec3 camDir;
};

struct BaseLight {
  vec3 direction;
  vec3 ambient;
  vec3 nightAmbient;
  // Lobe-specific overrides.
  // TODO: Remove these and move more towards PBR responses
  vec3 diffuse;
  vec3 specular;
};

struct SpatialLighting {
  vec3 irradiance;
  float skyVisibility;
};

// When moving to deferred, we can use these structs as gbuffers:
// Color + AO (RGBA),
// MRAE (RGBA),
// Normal + Opaque Depth (RGB),
// SpatialLighting (RG)

// Default values for lighting parameters.
const vec3 defaultMatAmbient = vec3(1.0);
const vec3 defaultMatDiffuse = vec3(1.0);
const vec3 defaultMatSpecular = vec3(0.5);
const vec3 defaultNightAmbient = vec3(0.08);
const vec3 defaultLightAmbient = vec3(0.7);
const vec3 defaultLightDiffuse = vec3(1.0);
const vec3 defaultLightSpecular = vec3(1.0);

BaseMaterialProperties DiffuseBaseMaterialProperties(vec3 color, vec3 normal, vec3 matAmbient, vec3 matDiffuse, vec3 matSpecular) {
  return BaseMaterialProperties(color, 0.0, 0.0, 1.0, 0.0, normal, matAmbient, matDiffuse, matSpecular);
}

SpatialLighting DefaultSpatialLighting() {
  return SpatialLighting(vec3(0.0), 1.0);
}

const float emissiveIntensity = 10.;

vec3 baseBrdf(
  BaseMaterialProperties material,
        // Scene properties
  BaseSceneProperties scene,
        // Lighting
  BaseLight light,
  SpatialLighting spatialLighting
) {
    // Compute diffuse/spec colors
  vec3 diffuseColor = material.baseColor - material.baseColor * material.metallic * 0.5 - material.baseColor * material.roughness * 0.5;
  vec3 specularColor = mix(vec3(1.0 - material.roughness), material.baseColor, vec3(material.metallic));

    // Normalize spatial lighting values
  vec3 irrF = normalizeIrrLightFactor(spatialLighting.irradiance);
  float skyF = normalizeSkyLightFactor(spatialLighting.skyVisibility);

    // AO
  float ao = getBaseAmbientOcclusion() * material.ao;

    // Night/day presence
  float presence = clamp(dot(light.direction, scene.up), 0.0, 1.0);

    // Compute lighting components.
  vec3 A = diffuseColor * getBaseAmbientComponent(presence, material.matAmbient, light.ambient, light.nightAmbient);
  vec3 D = diffuseColor * getBaseDiffuseComponent(presence, material.normal, light.direction, material.matDiffuse, light.diffuse);
  vec3 S = specularColor * getBaseSpecularComponent(presence, material.roughness, material.metallic, material.normal, scene.camDir, light.direction, material.matSpecular, light.specular);
  vec3 E = material.emissive * emissiveIntensity * material.baseColor;
  vec3 I = irrF * diffuseColor;
  return skyF * ao * (A + D + S) + E + I;
}

float computeFog(float dist, float fogStart, float fogEnd) {
  return clamp((dist - fogStart) / (fogEnd - fogStart), 0.0, 1.0);
}

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float remap(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

// Constants affecting buffer sampling logic.
const uint kBufferWidth = 2048u;

uint readBuffer(in highp usampler2D buffer, uint index) {
  ivec2 uv = ivec2(index % kBufferWidth, index / kBufferWidth);
  return texelFetch(buffer, uv, 0).r;
}

#endif  // _SRC_CLIENT_GAME_SHADERS_COMMON_GLSL

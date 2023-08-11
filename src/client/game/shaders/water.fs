#version 300 es

precision highp float;

#include "lighting.glsl"
#include "terrain.glsl"

// Material properties.
const vec3 matSpecular = defaultMatSpecular * 0.2;
const float matRoughness = 0.0;
const float distanceScale = 0.8;

// Light properties.
const vec3 nightAmbient = defaultNightAmbient * vec3(1.0, 2.0, 1.0);
const vec3 lightAmbient = defaultLightAmbient * 0.43;
const vec3 lightDiffuse = defaultLightDiffuse * 0.4;

// Depth fog properties
const float fogDepthDistNear = 4.0;
const float fogDepthDistFar = 40.0;
const float fogDepthSkyDistNear = 20.0;
const float fogDepthSkyDistFar = 30.0;
const float minDayOpac = 0.7;
const float minNightOpac = 0.8;
const float fogExp = 2.0;

// Tweak the normal map stuff.
uniform int normalQuantization;
uniform float normalIntensity;
uniform float normalOctave1;
uniform float normalOctave2;
uniform float normalOctaveStrength1;
uniform float normalOctaveStrength2;
uniform float normalSpeed;
uniform float normalDistortion;

// Distance fog
// TODO: uniformize this
const float fogStart = 64.0;
const float fogEnd = 128.0;

// Texture uniforms.
uniform sampler2D color;
uniform sampler2D normalMap;
uniform sampler2D distortionMap;
uniform vec2 viewportSize;

// Lighting uniforms.
uniform highp usampler2D lightingRank;
uniform highp usampler2D lightingData;

// Opaque depth buffer
uniform sampler2D baseDepth;

// Environment uniforms.
uniform int inWater;
uniform uint numReflectionSteps;

// Interpolated vertex input.
in float _time;
in vec3 _blockCoord;
in vec2 _texCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
in vec3 _tangent;
in vec3 _cotangent;
in float _muckiness;
// For water reflections.
in vec4 _incomingRay;
in mat4 _projectionMatrix;

// Output fragment color.
layout (location = 0) out vec4 outColor;

// Tweak water reflections.
uniform float useReflection; // Higher means reflection is more prevalent.
float fresnelFactorCuttoff = 0.03; // Higher means ignore computing more reflections for rays with a higher angle.
float maxDistance = 70.0;

float inWaterMuckReduceFactor = 0.57; // The water surface would otherwise be too green when in the water.
uniform float muckRate;

uvec3 getBlockCoord() {
  ivec3 coord = ivec3(floor(_blockCoord));
  return uvec3((32 + (coord % 32)) % 32);
}

uint getLightRank() {
  return getRank(lightingRank, getBlockCoord());
}

void sampleVoxelLightComponents(out vec3 irr, out float sky) {
  uint rank = getLightRank();
  readVoxelLightComponents(lightingData, rank, _blockCoord, irr, sky);
}

float getMuckiness() {
  return smoothstep(0.0, 1.0, clamp(muckRate * _muckiness, 0.0, 1.0));
}

vec3 getAmbientComponent(float nightMix) {
  vec3 ambient = lightAmbient * defaultMatAmbient;
  return mix(nightAmbient, ambient, nightMix);
}

vec3 getDiffuseComponent(vec3 up, vec3 normal, vec3 light, float nightMix) {
    // accentuate diffuse
  float intensity = pow(max(dot(normal, light), 0.0), 3.0);
  return max(lightDiffuse * defaultMatDiffuse * intensity, 0.0);
}

vec3 getSpecularComponent(vec3 normal, vec3 eye, vec3 light, float dist, vec3 surfNormal) {
  // add roughness and specular at distance
  float distScale = distanceScale * clamp((dist - 0.0) / 100.0, 0.0, 1.0);
  vec3 s = clamp(matSpecular * defaultLightSpecular + distScale, 0.0, 1.0);
  vec3 bGgx = ggx(matRoughness + distScale * 0.2, normal, eye, light) * s;

  // stylized far blend to spec light -- adds a horizon feel to water
  float rf = 1.0 - clamp(dot(eye, surfNormal), 0.0, 1.0);
  float rf2 = rf * rf;
  float rf4 = rf2 * rf2;
  float rf8 = rf4 * rf4;
  vec3 rim = rf8 * s * 12.0 * distScale;

  return clamp(bGgx + rim, 0.0, 200.0);
}

vec3 sampleNormalMapOctave(vec2 texCoord, float time, float octave, vec2 speed) {
  vec2 distortionSpeed = vec2(-1.0, 1.0) * speed;
  vec2 distortionCoord = octave * 0.1 * texCoord + distortionSpeed * time;
  vec2 distortion = texture(distortionMap, distortionCoord).xy - 0.5;

  vec2 normalSpeed = vec2(3.0, 3.0) * speed;
  vec2 normalCoord = octave * 0.3 * texCoord + normalSpeed * time;
  vec3 normal = texture(normalMap, normalCoord + normalDistortion * distortion).xyz - 0.5;

  return normalize(normal);
}

vec3 sampleNormalMap(vec2 texCoord, float time) {
  vec3 n1 = sampleNormalMapOctave(texCoord, time, normalOctave1, normalSpeed * vec2(0.005, 0.003));
  vec3 n2 = sampleNormalMapOctave(texCoord, time, normalOctave2, normalSpeed * vec2(0.02, 0.03));
  return normalize(normalOctaveStrength1 * n1 + normalOctaveStrength2 * n2);
}

float getFoamOpacity(vec2 texCoord, float time, float depthDiff, float fragDepth) {
  // Water foam
  // Modulate by normal noise
  vec2 distortionSpeed = vec2(-1.0, 1.0) * 0.001;
  vec2 distortionCoord = 0.1 * 0.1 * texCoord + distortionSpeed * time;
  vec2 distortion = texture(distortionMap, distortionCoord).xy;
  // Depth fade close to edges
  float foamOpac = clamp(1.0 - (depthDiff - 0.5 + (distortion.g * 1.0)) / 2.0, 0.0, 1.0) * 1.0 * step(0.0, depthDiff);
  foamOpac = clamp(foamOpac * (distortion.r + 0.3) * 1.0, 0.0, 0.5);
  // Scale by distance
  foamOpac *= clamp((fragDepth - 10.0) / 20.0, 0.0, 1.0);
  return foamOpac;
}

// Number between 0 and 1 which represents how much of a reflection to use.
// This is determined by the sharpness of the angle between the reflection and normal.
float getFresnelFactor(vec3 normal, vec3 reflection) {
  float dotProduct = dot(normalize(normal), normalize(reflection));
  float angleInRadians = acos(dotProduct);

  // Use an approximation of the Fresnel equation.
  float R = 0.02;
  return R + (1.0 - R) * pow(1.0 - cos(angleInRadians), 5.0);
}

vec4 getReflectionColor(vec3 normal) {
  vec4 noHitColor = vec4(0.0);

  // Get the effective normal by mixing the exactly perfect normal with the noisy normal to get something less noisy.
  vec3 reflectedRay = normalize(reflect(normalize(_incomingRay.xyz), normal));

  // Bring back if outside of the fustrum.
  if (reflectedRay.z > 0.0) {
    maxDistance = min(maxDistance, (-1.0 - _incomingRay.z) / reflectedRay.z);
  }

  // Calculate the start and end of the reflected ray in view space.
  vec4 startView = vec4(_incomingRay.xyz, 1.0);
  vec4 endView = vec4(_incomingRay.xyz + (reflectedRay * maxDistance), 1.0);

  // Calculate the start of the reflected ray in clip space.
  vec4 startFrag = startView;
  startFrag = _projectionMatrix * startFrag;
  startFrag.xyz /= startFrag.w;
  startFrag.xy = startFrag.xy * 0.5 + 0.5;
  startFrag.xy *= viewportSize;

  // Calculate the start of the reflected ray in clip space.
  vec4 endFrag = endView;
  endFrag = _projectionMatrix * endFrag;
  endFrag.xyz /= endFrag.w;
  endFrag.xy = endFrag.xy * 0.5 + 0.5;
  endFrag.xy *= viewportSize;

  float progress = 0.0;
  float progressPerIteration = 1.0 / float(numReflectionSteps);

  for (uint i = 0u; i < numReflectionSteps; ++i) {
    progress += progressPerIteration;
    vec2 currentFrag = mix(startFrag.xy, endFrag.xy, progress);
    if (currentFrag.x < 0.0 || currentFrag.x > viewportSize.x || currentFrag.y < 0.0 || currentFrag.y > viewportSize.y) {
      return noHitColor;
    }

    // Depth of the marched ray at this step.
    float t = (-startView.z * progress) / (progress * -startView.z + (1.0 - progress) * -endView.z);
    float marchedRayDepth = -mix(startView.z, endView.z, t);

    // Depth of the object at this step.
    float objectDepth = texture(baseDepth, currentFrag / viewportSize).r;

    float skyDepth = 0.0;
    // Check if we hit the sky (plus some error) and ignore if we do.
    if (abs(objectDepth) < skyDepth + 0.001) {
      continue;
    }

    if (abs(objectDepth - marchedRayDepth) < 3.0) {
      // We hit an object along our march so output the color of the object.
      float fresnel = getFresnelFactor(normal, reflectedRay);
      // Optimization: works beacuse if fresnel < 0.05 we will barely see it anyways.
      if (fresnel < fresnelFactorCuttoff) {
        return noHitColor;
      }
      vec4 result = texture(color, currentFrag / viewportSize);
      result.a = clamp(2.0 * fresnel, 0.0, 1.0);
      return result;
    }
  }

  return noHitColor;
}

//vec3 waterColorLight = vec3(0.01, 0.03, 0.075);
vec3 waterColorDark = vec3(0.01, 0.03, 0.075);
vec3 waterColorLight = vec3(0.05, 0.25, 0.55);
vec3 waterSpecColorDark = vec3(0.00011, 0.00012, 0.00015);
vec3 waterSpecColorLight = vec3(0.08, 0.09, 0.1);

void main() {
  // Sample the normal map.
  int q = normalQuantization;
  vec2 texCoord = _texCoord;
  if (q != 0) {
    texCoord = floor(vec2(float(q) * texCoord)) / float(q);
  }
  vec3 texNormal = sampleNormalMap(texCoord, normalSpeed * _time);

  // Sample the light map.
  vec3 irr = vec3(0.0);
  float sky = 0.0;
  sampleVoxelLightComponents(irr, sky);

  // Account for the texture's ambient occlusion in the final light discount factor.
  vec3 irrF = normalizeIrrLightFactor(irr);
  vec3 skyF = vec3(normalizeSkyLightFactor(sky));

  // Compute light component vectors.
  vec3 normal = normalize(mat3(_tangent, _cotangent, _normal) * texNormal);
  vec3 surfNormal = normalize(_normal);
  normal = normalize(mix(surfNormal, normal, normalIntensity));
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);
  vec3 up = normalize(_up);

  float nightMix = max(dot(light, up), 0.0);

  // Depth Fog
  float existingDepth = texture(baseDepth, gl_FragCoord.xy / viewportSize).r;
  float fragDepth = gl_FragCoord.z / gl_FragCoord.w;
  float depthDiff = existingDepth - fragDepth;
  if (inWater == 1) {
      // Match skyfade fog distance; TODO: move this to a uniform, share with skyfade
    depthDiff *= 4.0;
  }

  float fogDepthDist = mix(fogDepthDistNear, fogDepthDistFar, clamp(1.0 - fragDepth / (fogDepthDistFar), 0.0, 1.0));
  float fogDepth = (mix(minNightOpac, minDayOpac, nightMix) + clamp(pow(depthDiff / fogDepthDist, fogExp), 0.0, 1.0));

  vec3 mixedLight = mix(reflect(-eye, surfNormal), light, nightMix);
  // go between a "dark" and "light" water color - night is dark
  // and day "deep fog" areas are dark.
  // "day" is light, but don't show this difference in the distance, since we
  // should only see this dark fog when we are close by.
  vec3 baseColor = mix(waterColorDark, waterColorLight, nightMix);
  // transition to night a bit quicker so we don't get super crazy highlights during sunset
  vec3 specColor = mix(waterSpecColorDark, waterSpecColorLight, clamp((1.1 * nightMix) - 0.1, 0.0, 1.0));
  if (inWater == 1) {
      // more closely match the water fog color
      // TODO: make this a uniform, share with skyfade
    baseColor = vec3(0.02, 0.08, 0.18);
  }

  // Blend in muckyness color. Swap B and G
  float muckiness = getMuckiness();
  baseColor = mix(baseColor, baseColor.rbg, (inWater == 1 ? muckiness * inWaterMuckReduceFactor : muckiness) / 2.0);

  // Compute sky lighting components.
  vec3 A = baseColor * getAmbientComponent(nightMix);
  vec3 D = baseColor * getDiffuseComponent(up, normal, mixedLight, nightMix);
  vec3 S = specColor * getSpecularComponent(normal, eye, mixedLight, fragDepth, surfNormal);
  vec3 I = baseColor * irrF;

  // fog against empty/sky. If we're further than the cutoff, and the sky is behind us,
  // completely fog. this is a hack to prevent seeing silhouettes through far water.
  // but still allow close water to fog the sky.
  // this doesn't solve getting close to the water to use it to see silhouettes
  // of far terrain, though
  float fullFogMult = 1.0;
  if (inWater == 1) {
      // More aggressive fade to "sky" when underwater
    fullFogMult = 1000.0;
  }
  float distFullFog = (clamp(((fragDepth * fullFogMult) - fogDepthSkyDistNear) / (fogDepthSkyDistFar - fogDepthSkyDistNear), 0.0, 1.0) * (step(existingDepth, fragDepth)));

  // Output the fragment color.
  vec3 litColor = skyF * (A + D + S) + I;

  // Reflection.
  if (numReflectionSteps > uint(0)) {
    vec4 reflectionColor = getReflectionColor(normal);
    litColor = mix(litColor, reflectionColor.xyz, inWater == 1 ? 0.0 : useReflection * reflectionColor.a);
  }

  float alpha = clamp(clamp(fogDepth, 0.0, 1.0) + distFullFog, 0.0, 1.0);
  outColor = vec4(litColor, alpha);
}

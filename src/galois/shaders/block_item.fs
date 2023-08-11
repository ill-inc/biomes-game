#version 300 es

precision highp float;

// Material properties.
const vec3 matAmbient = vec3(0.4);
const vec3 matDiffuse = vec3(1.7);
const vec3 matSpecular = vec3(0.25);
const float emissiveIntensity = 10.;

// Light properties.
const vec3 lightAmbient = vec3(0.7);
const vec3 lightDiffuse = vec3(1.0);
const vec3 lightSpecular = vec3(1.0);

// Texture uniforms.
uniform uint sampleIndex;
uniform highp usampler2D textureIndex;
uniform lowp sampler2DArray colorMap;
uniform lowp sampler2DArray mreaMap;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
flat in uint _direction;

// Output fragment color.
layout (location = 0) out vec4 color;

// Constants affecting buffer sampling logic.
const uint kBufferWidth = 2048u;
const uint kDirCount = 6u;

uint readBuffer(in highp usampler2D buffer, uint index) {
  ivec2 uv = ivec2(index % kBufferWidth, index / kBufferWidth);
  return texelFetch(buffer, uv, 0).r;
}

uint getTextureIndex() {
  return readBuffer(textureIndex, kDirCount * sampleIndex + _direction);
}

float getAmbientOcclusion() {
  return 1.0;
}

vec3 getAmbientComponent() {
  return lightAmbient * matAmbient;
}

vec3 getDiffuseComponent(vec3 normal, vec3 light) {
  vec3 diffuse = lightDiffuse * matDiffuse;
  // Half lambert
  float falloff = dot(normal, light) * 0.5 + 0.5;
  return max(0.0, falloff * falloff) * diffuse;
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

  float ao = getAmbientOcclusion() * texAo;

  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 eye = normalize(_eye);

  vec3 baseColor = texColor;
  vec3 diffuseColor = baseColor - baseColor * metallic * 0.5 - baseColor * roughness * 0.5;
  vec3 specularColor = mix(vec3(1.0 - roughness), baseColor, vec3(metallic));

  // Compute lighting components.
  vec3 A = ao * baseColor * getAmbientComponent();
  vec3 D = ao * diffuseColor * getDiffuseComponent(normal, light);
  vec3 S = ao * specularColor * getSpecularComponent(roughness, metallic, normal, eye, light);
  vec3 E = emissive * baseColor * emissiveIntensity;

  // Output the fragment color.
  vec3 litColor = A + D + S + E;
  color.rgba = vec4(litColor, 1.0);

  // Gamma correction.
  color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
}

#version 300 es

precision highp float;
precision lowp sampler2DArray;

// Material properties.
const vec3 matAmbient = vec3(1.0);
const vec3 matDiffuse = vec3(1.0);
const vec3 matSpecular = vec3(0.0);
const float matShininess = 4.0;

// Light properties.
const vec3 nightAmbient = vec3(0.1, 0.1, 0.2);
const vec3 lightAmbient = vec3(0.6);
const vec3 lightDiffuse = vec3(0.8);
const vec3 lightSpecular = vec3(1.0);

// Texture uniforms.
uniform sampler2DArray colorMap;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _up;
in vec3 _eye;
in vec3 _light;
in vec3 _normal;
flat in int _texIndex;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

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

  // Compute lighting components.
  vec3 A = getAmbientComponent(up, light);
  vec3 D = getDiffuseComponent(up, normal, light);
  vec3 S = getSpecularComponent(normal, light, halfv);

  // Output the fragment color.
  vec3 litColor = texColor.rgb * (A + D) + S;
  outColor = vec4(litColor, 1.0);
  outNormal = vec4(normal, 1.0) * sign(dot(normal, _eye));
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}
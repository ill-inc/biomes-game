#version 300 es

precision highp float;
precision lowp sampler2DArray;

// Material properties.
const vec3 matAmbient = vec3(1.0, 1.0, 1.0);
const vec3 matDiffuse = vec3(1.0, 1.0, 1.0);
const vec3 matSpecular = vec3(1.0, 1.0, 1.0);
const float matShininess = 4.0;

// Light properties.
const vec3 lightAmbient = vec3(0.5, 0.5, 0.5);
const vec3 lightDiffuse = vec3(0.5, 0.5, 0.5);
const vec3 lightSpecular = vec3(0.0, 0.0, 0.0);

// Texture uniforms.
uniform sampler2DArray colorMap;

// Interpolated vertex input.
in vec3 _normal;
in vec2 _texCoord;
flat in int _texIndex;
in vec3 _light;
in vec3 _eye;

// Output fragment color.
layout (location = 0) out vec4 color;

vec3 getAmbientComponent() {
  return lightAmbient * matAmbient;
}

vec3 getDiffuseComponent(vec3 normal, vec3 light) {
  vec3 diffuse = lightDiffuse * matDiffuse;
  return max(0.0, dot(normal, light)) * diffuse;
}

vec3 getSpecularComponent(vec3 normal, vec3 halfv) {
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

  // Compute lighting components.
  vec3 A = getAmbientComponent();
  vec3 D = getDiffuseComponent(normal, light);
  vec3 S = getSpecularComponent(normal, halfv);

  // Output the fragment color.
  vec3 litColor = texColor.rgb * (A + D) + S;
  color.rgba = vec4(litColor, 1.0);

  // Gamma correction.
  color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
}
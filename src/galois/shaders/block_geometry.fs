#version 300 es

precision highp float;

// Material properties.
const float matShininess = 4.0;
const vec3 matAmbient = vec3(1.0, 1.0, 1.0);
const vec3 matDiffuse = vec3(1.0, 1.0, 1.0);
const vec3 matSpecular = vec3(1.0, 1.0, 1.0);

// Light properties.
const vec3 lightAmbient = vec3(0.7, 0.7, 0.7);
const vec3 lightDiffuse = vec3(0.5, 0.5, 0.5);
const vec3 lightSpecular = vec3(0.0, 0.0, 0.0);

// Interpolated vertex input.
in vec3 _eye;
in vec3 _light;
in vec3 _normal;

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
  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 light = normalize(_light);
  vec3 halfv = normalize(0.5 * (_eye + _light));

  // Compute lighting components.
  vec3 A = getAmbientComponent();
  vec3 D = getDiffuseComponent(normal, light);
  vec3 S = getSpecularComponent(normal, halfv);

  // Output final light value with gamma correction.
  color.rgb = pow((A + D) + S, vec3(1.0 / 2.2));
}

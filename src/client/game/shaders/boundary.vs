#version 300 es

// Uniforms.
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in vec3 normal;

out vec2 _texCoord;

void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 tangent = normal.yzx;
    vec3 cotangent = cross(normal, normal.yzx);
    float u = dot(tangent, worldPos.xyz);
    float v = dot(cotangent, worldPos.xyz);
    _texCoord = vec2(u, v);
}
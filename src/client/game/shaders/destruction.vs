#version 300 es

// Constants.
const vec3[6] normals = vec3[](vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1));

// Uniforms.
uniform mat3 normalMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 origin;

// Vertex attributes.
in vec3 position;
in vec3 normal;
in vec2 uv;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec2 _texCoord;
out vec3 _normal;

vec2 texCoords(vec3 position, vec3 normal) {
  if (abs(normal.x) > 0.01) {
    return position.zy;
  } else if (abs(normal.y) > 0.01) {
    return position.xz;
  } else if (abs(normal.z) > 0.01) {
    return position.xy;
  } else {
    return vec2(0, 0);
  }
}

void main() {
  vec3 worldPosition = origin + position;
  vec4 viewPosition = modelViewMatrix * vec4(worldPosition, 1.0);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _texCoord = texCoords(position, normal);

  // Emit the view-dependent vertex attributes.
  _normal = normal;
}

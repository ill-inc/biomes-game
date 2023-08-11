#version 300 es

// Uniforms.
uniform mat3 normalMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 light;

// Vertex attributes.
in float direction;
// Match default ThreeJS UV/TexCoord name
in vec2 uv;
in vec3 normal;
in vec3 position;
in vec4 color;

// Varying output to the fragment shader. All of the spatial outputs
// are represented in view coordinates and relative to the vertex.
out vec2 _texCoord;
out vec3 _up;
out vec3 _eye;
out vec3 _light;
out vec3 _normal;
out vec4 _color;
out vec3 _worldPos;
out vec3 _worldNormal;
flat out uint _direction;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0f);

  // Set the vertex position on the screen.
  gl_Position = projectionMatrix * viewPosition;

  // Forward view-independent vertex attributes.
  _direction = uint(direction);
  _texCoord = uv;

  // Emit the view-dependent vertex attributes.
  _normal = normalize(normalMatrix * normal);
  _light = normalize(normalMatrix * light);
  _up = normalize(normalMatrix * vec3(0.0f, 1.0f, 0.0f));
  _eye = -normalize(viewPosition.xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0f);
  _worldPos = worldPos.xyz / worldPos.w;
  // Temp hack: normal from world pos.
  // eventually pass in normal/inverse transpose of model matrix
  vec4 worldPosN = modelMatrix * vec4(normal + position, 1.0f);
  _worldNormal = normalize(worldPosN.xyz / worldPosN.w - _worldPos);
  _color = color;
}

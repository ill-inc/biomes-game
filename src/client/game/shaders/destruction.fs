#version 300 es

precision highp float;

// Destroying / shaping block preview
uniform int destroyTextureFrame;
uniform lowp sampler2DArray destroyTexture;

// Interpolated vertex input.
in vec2 _texCoord;
in vec3 _normal;

// Output fragment color.
layout (location = 0) out vec4 outColor;
layout (location = 1) out vec4 outNormal;
layout (location = 2) out float outBaseDepth;

void main() {
  // Compute light component vectors.
  vec3 normal = normalize(_normal);
  vec3 colorUVW = vec3(mod(_texCoord, 1.0), destroyTextureFrame);
  vec4 texColor = texture(destroyTexture, colorUVW).rgba;

  // Output the fragment color.
  outColor = vec4(0.0, 0.0, 0.0, texColor.g * texColor.a * 1.8);

  outNormal = vec4(normal, 1.0);
  outBaseDepth = gl_FragCoord.z / gl_FragCoord.w;
}

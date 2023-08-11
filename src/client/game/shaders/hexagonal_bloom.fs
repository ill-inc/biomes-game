#version 300 es

precision highp float;

in vec4 _worldPos;
in vec3 _worldNormal;
in vec2 _texCoord;
in vec2 _quadCoord;

uniform float fadeOut;
uniform vec3 playerPos;
uniform float maxIntensity;
uniform float hexThickness;
uniform float hexSmoothing;
uniform float hexGridScale;
uniform vec3 hexColor;
uniform int quantization;
uniform float time;
uniform float heightScaling;

uniform float shimmeryBrightness;
uniform float shimmerySpeed;
uniform float shimmeryFatness;
uniform float shimmeryFrequency;

const vec2 hexRadii = vec2(1, 1.7320508);
const int maxQuantization = 100;

vec4 toHexCoords(vec2 uv) {
  vec4 hc = floor(vec4(uv, uv - vec2(.5, 1)) / hexRadii.xyxy) + .5;
  vec4 h = vec4(uv - hc.xy * hexRadii, uv - (hc.zw + .5) * hexRadii);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + .5);
}

float toHexDistance(vec2 hc) {
  hc = abs(hc);
  return 0.5 - max(dot(hc, hexRadii * .5), hc.x);
}

// Output fragment color.
layout (location = 0) out vec4 outColor;

float square(float x) {
  return x * x;
}

float quadDist(vec2 quadCoord) {
  float du = min(abs(1.0 - quadCoord.x), abs(quadCoord.x));
  float dv = min(abs(1.0 - quadCoord.y), abs(quadCoord.y));
  return min(du, dv);
}

float horizontalGridDist(vec2 texCoord) {
  float m = mod(8.0 * texCoord.y, 1.0);
  return min(abs(1.0 - m), abs(m));
}

float funnyDistance(vec3 p, vec3 q) {
  return length(vec3(1.0, heightScaling, 1.0) * (p - q));
}

float shimmer(float t) {
  return shimmeryBrightness * max(0.0, 1.0 - smoothstep(0.0, shimmeryFatness, mod(t, shimmeryFrequency)));
}

void main() {
  // Sample the normal map.
  vec2 texCoord = hexGridScale * _texCoord + 0.0 * vec2(time, time);
  if (quantization != 0) {
    float q = max(float(maxQuantization - quantization), 1.0);
    texCoord = floor(vec2(float(q) * texCoord)) / float(q);
  }

  float hexDist = toHexDistance(toHexCoords(texCoord).xy);
  //float hexDist = 1.0 / 4.0 * horizontalGridDist(texCoord);

  // Update distance to include distance to quad boundaries.
  hexDist = min(hexDist, 0.25 * quadDist(_quadCoord) / hexThickness);

  // Start with the opacity based on the hexagonal grid.
  float opacity = 1.0 - smoothstep(hexThickness, hexSmoothing * hexThickness, hexDist);
  opacity *= maxIntensity;

  // Amplify the intensity based on y.
  float k = opacity / maxIntensity;
  opacity += k * shimmer(texCoord.x + texCoord.y + shimmerySpeed * time);
  opacity += k * shimmer(texCoord.x - texCoord.y + 1.1 * shimmerySpeed * time);
  opacity = clamp(opacity, 0.0, 1.0);

  // Drop opacity based on player distance.
  float playerDist = funnyDistance(playerPos, _worldPos.xyz / _worldPos.w);
  opacity *= 1.0 - smoothstep(4.0, 8.0, playerDist);

  // Drop opacity based on player projection distance.
  float playerProjection = dot(_worldNormal, playerPos - _worldPos.xyz / _worldPos.w);
  opacity *= 1.0 - square(smoothstep(7.0, 8.0, playerProjection));

  // Drop opacity based on fadeout animation.
  opacity *= fadeOut;

  outColor.rgba = vec4(hexColor, opacity);
}

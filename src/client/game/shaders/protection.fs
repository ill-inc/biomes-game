#version 300 es

precision highp float;

in vec4 _worldPos;
in vec2 _texCoord;
in vec3 _eye;

uniform sampler2D patternTexture;
uniform vec2 texScale;
uniform float opacity;

// Ring around playerpos
uniform vec4 ringColor;
uniform float ringFadeDistance;
uniform float ringFadePower;
uniform float ringSize;

// Larger fade in close to playerpos
uniform float closeFadeDistance;
uniform float closeFadePower;

// Fade into a plane
uniform float closePlaneDistance;
uniform float closePlaneAlpha;

// Player pos updated on render tick
uniform float fadeOut;

// Tweaks
uniform bool fadeOutOpacityOnly;
uniform bool hideBehindCharacter;
uniform vec3 playerPos;
uniform bool pixelHighlight;

// Output fragment color.
layout (location = 0) out vec4 outColor;

void main() {
  vec4 patternTex = texture(patternTexture, texScale * _texCoord);
  // Just read from the distortion texture until we want to try a new one
  outColor = patternTex;
  outColor.a *= fadeOut * opacity;

  // distance to player, for close and ring
  vec3 worldPos = _worldPos.xyz / _worldPos.w;
  float playerDist = distance(playerPos, worldPos);

  // Quantize
  if (pixelHighlight) {
    playerDist = max(max(abs(playerPos.x - worldPos.x), abs(playerPos.y - worldPos.y)), abs(playerPos.z - worldPos.z));
    playerDist -= mod(playerDist, 0.1);
  }

  // Make a ring
  float ringDist = playerDist - ringSize;
  float ringAlpha = ringColor.a * pow(1.0 - clamp(abs(ringDist) / ringFadeDistance, 0.0, 1.0), ringFadePower);
  ringAlpha = clamp(ringAlpha, 0.0, 1.0) * fadeOut;

  outColor.rgb = mix(outColor.rgb, ringColor.rgb, ringAlpha);
  outColor.a += ringAlpha;
  outColor.a *= step(0.0, ringDist);

  // scale alpha by dist to player
  float closeFade = pow(1.0 - clamp(playerDist / closeFadeDistance, 0.0, 1.0), closeFadePower);
  outColor.a *= closeFade;

  // Mix with opaque plane
  float closePlaneOpac = pow(clamp(1.0 - playerDist / closePlaneDistance, 0.0, 1.0) * step(0.0, playerDist - ringSize), 2.0) * closePlaneAlpha;
  outColor.a += closePlaneOpac * fadeOut;
  outColor.rgb = mix(outColor.rgb, vec3(1.0, 1.0, 1.0), closePlaneOpac * fadeOut);

  // Hide when getting close to the camera in view space
  outColor.a *= hideBehindCharacter ? clamp(gl_FragCoord.z / gl_FragCoord.w - 2.5, 0.0, 1.0) : 1.0;
}

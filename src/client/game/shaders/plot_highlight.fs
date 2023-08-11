#version 300 es

precision highp float;

in vec3 _modelPosition;
in vec3 _normal;
in vec4 _worldPos;
in vec2 _texCoord;

uniform sampler2D baseDepth;
uniform sampler2D normalTexture;
uniform sampler2D patternTexture;
uniform bool usePattern;
uniform vec2 viewportSize;

// Depthfade against existing geo
uniform vec3 highlightColor;
uniform float depthFadeDistance;
uniform float depthFadePower;
uniform float depthFadeOpacity;

// Ring around playerpos
uniform vec4 ringColor;
uniform float ringFadeDistance;
uniform float ringFadePower;
uniform float ringSize;

// Larger fade in close to playerpos
uniform vec4 closeColor;
uniform float closeFadeDistance;
uniform float closeFadePower;
uniform float closePlaneDistance;

// Completely fade out past farDist
uniform float farDist;
uniform float farDistFadeDistance;

// Player pos updated on render tick
uniform vec3 playerPos;

// Output fragment color.
layout (location = 0) out vec4 outColor;

void main() {
  // existing screen depth/normal
  vec2 screenUv = gl_FragCoord.xy / viewportSize;
  float existingDepth = texture(baseDepth, screenUv).r;
  vec3 existingViewNormal = texture(normalTexture, screenUv).rgb;
  float pattern = usePattern ? texture(patternTexture, _texCoord).a : 1.0;

  // current geo depth
  float fragDepth = gl_FragCoord.z / gl_FragCoord.w;

  // depthfade against existing geo
  float depthDiff = clamp(existingDepth - fragDepth, 0.0, depthFadeDistance);
  float fadeOpac = clamp(pow(1.0 - depthDiff / depthFadeDistance, depthFadePower) * step(fragDepth, existingDepth) * depthFadeOpacity, 0.0, 1.0);
  // don't show if coplanar with existing geometry
  float coplanar = smoothstep(0.1, 1.0, abs(dot(_normal, existingViewNormal)));
  fadeOpac *= step(mix(0.1, 0.3, coplanar), abs(depthDiff));
  fadeOpac = clamp(fadeOpac, 0.0, 1.0);

  // distance to player, for close and ring
  vec3 worldPos = _worldPos.xyz / _worldPos.w;
  float playerDist = distance(playerPos, worldPos);

  // fade to closeColor based on player pos
  float closeAlpha = closeColor.a * pow(1.0 - clamp(playerDist / closeFadeDistance, 0.0, 1.0), closeFadePower) * step(ringSize, playerDist);
  closeAlpha = clamp(closeAlpha, 0.0, 1.0);

  // Make a ring
  float ringDist = playerDist - ringSize;
  float ringAlpha = ringColor.a * pow(1.0 - clamp(abs(ringDist) / ringFadeDistance, 0.0, 1.0), ringFadePower);
  ringAlpha = clamp(ringAlpha, 0.0, 1.0);

  // Don't do other fades inside ring
  fadeOpac *= step(ringSize, playerDist);
  closeAlpha *= step(ringSize, playerDist);

  // mix with pattern
  fadeOpac *= max(pattern, 0.1);
  closeAlpha *= max(pattern, clamp(1.0 - playerDist / closePlaneDistance, 0.0, 1.0));

  // mix closecolor with depthfade
  vec4 borderColor = vec4(mix(closeColor.rgb, highlightColor, fadeOpac), max(fadeOpac, closeAlpha));

  // mix with ring
  borderColor.rgb = mix(borderColor.rgb, ringColor.rgb, ringAlpha);
  borderColor.a = max(borderColor.a, ringAlpha);

  // fade out to nothing past farDist
  borderColor.a *= 1.0 - clamp((playerDist - farDist) / farDistFadeDistance, 0.0, 1.0);

  outColor = borderColor;
}

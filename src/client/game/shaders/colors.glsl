#if !defined(_SRC_CLIENT_GAME_SHADERS_COLORS_GLSL)
#define _SRC_CLIENT_GAME_SHADERS_COLORS_GLSL

#include "src/client/game/shaders/common.glsl"

vec3 reinhardLuminance(vec3 color, float maxLum) {
    float oldLum = max(luminance(color), 0.01);
    float newLum = oldLum * (1.0 + (oldLum / (maxLum * maxLum))) / (1.0 + oldLum);
    return color * newLum / oldLum;
}

vec3 linearToSrgb(in vec3 linear) {
    return vec3(mix(pow(linear, vec3(0.41666)) * 1.055 - vec3(0.055), linear * 12.92, vec3(lessThanEqual(linear, vec3(0.0031308)))));
}

vec4 applyBiomesColorCorrection(in vec4 linear) {
    vec3 toneMapped = reinhardLuminance(linear.rgb, 2.0);

    vec3 srgb = linearToSrgb(toneMapped.rgb);

    return vec4(srgb, linear.a);
}

#endif  // _SRC_CLIENT_GAME_SHADERS_COLORS_GLSL

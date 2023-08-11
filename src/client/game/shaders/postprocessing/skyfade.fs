#version 300 es

precision highp float;

#include "sky_constants.glsl"
#include "fog.glsl"
#include "packing.glsl"
#include "src/client/game/shaders/colors.glsl"

// Textures
uniform sampler2D color;
uniform sampler2D secondaryColor;
uniform sampler2D punchthroughColor;
uniform sampler2D translucency;
uniform sampler2D depth;
uniform sampler2D cloudPattern;
uniform sampler2D skyColorSkyMapLUT;
uniform sampler2D skyColorTransmittanceLUT;
// Camera
uniform float cameraNear;
uniform float cameraFar;
uniform vec3 cameraUp;
uniform vec3 cameraForward;
uniform float cameraFov;
uniform float cameraAspect;
uniform vec3 worldCameraPosition;
// Dynamic
uniform float time;
// Screen position
in vec2 vUv;

// Fog
uniform float fogStart;
uniform float fogEnd;

// Water
uniform int inWater;

// Muck
uniform float muckyness;

// Sky
uniform vec3 sunDirection;
uniform vec3 moonDirection;
// Direction on the offset circle that occludes part of the moon's surface.
uniform vec3 moonDirectionOffset;
uniform vec3 moonColor;
uniform vec3 sunColor;
uniform float skyGroundOffset;
uniform float skyHeightScale;

// LUT
uniform mediump sampler3D nightLut;
uniform vec3 nightLutSize;
uniform vec2 playerSpatialLighting;

vec3 sunWithBloom(vec3 rayDir) {
    // 0.53deg is covered by the sun.
    const float sunSolidAngle = 0.53 * 3.14 / 180.0;
    const float minSunCosTheta = cos(sunSolidAngle);

    float cosTheta = dot(rayDir, sunDirection);
    if (cosTheta >= minSunCosTheta)
        return vec3(1.0);

    float offset = minSunCosTheta - cosTheta;
    float gaussianBloom = exp(-offset * 50000.0) * 0.5;
    float invBloom = 1.0 / (0.02 + offset * 300.0) * 0.01;
    return vec3(gaussianBloom + invBloom);
}

vec3 computeMoonColor(vec3 rayDir) {
    // Degrees of the sky that are covered.
    const float moonAngleCoverage = 1.1;
    // Percentage of the moon that is covered.
    const float moonCoveragePercentage = 0.95;
    // Set color of occluding  face.
    vec3 overlay = vec3(1.0, 1.0, 1.0);
    const float minMoonCoverageCosTheta = cos((moonAngleCoverage * moonCoveragePercentage) * 3.1415926 / 180.0);
    float cosTheta = dot(rayDir, normalize(moonDirectionOffset));
    if (cosTheta >= minMoonCoverageCosTheta - 0.00003) {
        overlay = vec3(0.4, 0.4, 0.4);
    }
    if (cosTheta >= minMoonCoverageCosTheta) {
        overlay = vec3(0.2, 0.2, 0.2);
    }

    const float minMoonCosTheta = cos((moonAngleCoverage) * 3.1415926 / 180.0);
    cosTheta = dot(rayDir, normalize(moonDirection));
    if (cosTheta >= minMoonCosTheta) {
        return (vec3(1.0) + overlay) / vec3(2.0);
    }
    float offset = minMoonCosTheta - cosTheta;
    float gaussianBloom = exp(-offset * 50000.0) * 0.3;
    float invBloom = 1.0 / (0.02 + offset * 300.0) * 0.01;
    return vec3(gaussianBloom + invBloom);
}

float getAltitudeAngle(vec3 pos, vec3 camDir) {
    vec3 up = vec3(0.0, 1.0, 0.0);
    float heightMM = max((pos.y + skyGroundOffset) / 1000000.0 * skyHeightScale, 0.0002) + groundRadiusMM;
    float horizonAngle = acos(clamp(sqrt(heightMM * heightMM - groundRadiusMM * groundRadiusMM) / heightMM, -1.0, 1.0));
    float altitudeAngle = horizonAngle - acos(dot(camDir, up));
    return altitudeAngle;
}

vec3 getSkyColor(vec3 pos, vec3 camDir) {
    vec3 up = vec3(0.0, 1.0, 0.0);
    float altitudeAngle = getAltitudeAngle(pos, camDir);

    vec3 right = cross(sunDirection, up);
    vec3 forward = cross(up, right);
    vec3 projDir = normalize(camDir - up * dot(camDir, up));
    float sinTheta = dot(projDir, right);
    float cosTheta = dot(projDir, forward);
    float azimuthAngle = atan(sinTheta, cosTheta) + 3.14;

    // Non-linear mapping of altitude angle. See Section 5.3 of the paper.
    float v = 0.5 + 0.5 * sign(altitudeAngle) * sqrt(abs(altitudeAngle) * 2.0 / 3.14);
    vec2 uv = vec2(azimuthAngle / 6.28, v);

    return texture(skyColorSkyMapLUT, uv).rgb;
}

    // from https://www.shadertoy.com/view/4djSRW
vec2 hash23(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float stars(in vec3 dir) {
    // noise res - quantize to get less sparkly, and increase size of stars
    // maybe use framebuffer size?
    float noiseRes = 400.0;
    float density = 0.0001;

    vec3 quantDist = fract(dir * (noiseRes)) - 0.5;
    vec3 quantPos = floor(dir * (noiseRes));
    vec2 noise = hash23(quantPos);

    // apply falloff using distance from quantized noise pos
    float quantDistInv = 1.0 - length(quantDist);
    float c2 = quantDistInv * quantDistInv;

    // apply star noise, above density threshold
    c2 *= step(noise.x, density);

    // pow2 to get less spakrly
    return c2 * c2;
}

float planeHeight = 200.25;
float planeOffset = 0.0132;
float cloudUvScale = 5560.0;
float timeScale = 0.001;
float cloudiness = 0.536;
vec4 cloudColor = vec4(1.0, 1.0, 1.0, 0.7);
vec3 cloudOffsetColor = vec3(0.5, 0.5, 0.5);
float cloudFogStart = 1000.0;
float cloudFogEnd = 10000.0;

void computeCloudColor(vec3 cam, vec3 dir, float sunUp, out vec4 color, out float depth) {
    // Clouds: line plane intersection against 2 planes, sharing the same normal
    vec3 planeN = vec3(0.0, 1.0, 0.0);
    vec3 planePos = vec3(0.0, planeHeight, 0.0);
    vec3 planeToCam = cam - planePos;
    float planeAdjustedOffset = -dot(planeN, planeToCam) * planeOffset;
    vec3 plane2Pos = vec3(0.0, planeHeight + planeAdjustedOffset, 0.0);

    float det = -dot(dir, planeN);
    float t = dot(planeN, planeToCam) / det;
    float u = dot(cross(vec3(1, 0, 0), -dir), planeToCam) / det;
    float v = dot(cross(vec3(0, 0, 1), -dir), planeToCam) / det;
    vec2 timeOffset = vec2(0.0, time * timeScale);
    vec2 cloudUv = vec2(u, v) / cloudUvScale + timeOffset;

    float u2 = dot(cross(vec3(1, 0, 0), -dir), cam - plane2Pos) / det;
    float v2 = dot(cross(vec3(0, 0, 1), -dir), cam - plane2Pos) / det;
    vec2 cloudUv2 = vec2(u2, v2) / cloudUvScale + timeOffset;

    // Sample cloud textures
    // Replace step(x,y) with smoothstep(x, x+smooth, y) or smoothstep(y-smooth, y, x) for antialias
    // step is faster for lower end gpus, swap to it for low settings
    float isCloud1 = smoothstep(cloudiness - 0.001, cloudiness + 0.001, texture(cloudPattern, cloudUv).r);
    float isCloud2 = smoothstep(cloudiness - 0.001, cloudiness + 0.001, texture(cloudPattern, cloudUv2).r);
    float isCloud = clamp(isCloud1 + isCloud2, 0.0, 1.0) * (1.0 - clamp((t - cloudFogStart) / (cloudFogEnd - cloudFogStart), 0.0, 1.0)) * step(0.0, t);

    vec3 rgb = mix(cloudOffsetColor, cloudColor.rgb, isCloud1);
    rgb = mix(rgb * 0.01, rgb, clamp(sunUp * 7., 0.0, 1.0)); // apply darkening when its early/late
    color = vec4(rgb, isCloud * cloudColor.a);
    depth = t;
}

float skyBrightness = 24.0;
float skyPow = 0.99;
vec3 nightColor = vec3(0.0118, 0.0314, 0.102);

void computeSkyColor(vec3 cam, vec3 dir, float sunDown, out vec3 color) {
    // Compute the initial background sky color.
    color = pow(max(getSkyColor(cam, dir), 0.0), vec3(skyPow)) * skyBrightness;
    color += sunWithBloom(dir) * sunColor * (1.0 - clamp(sunDown * 13.0, 0.0, 1.0));

    float sunInclination = acos(sunDirection.y);
    if (sunInclination >= -1.570 && sunInclination <= 1.570) {
        color += mix(color, computeMoonColor(dir) * moonColor, clamp(0.5, 1.0, abs(sunInclination / 1.570)));
    } else {
        color += computeMoonColor(dir) * moonColor;
    }

    // hacky night
    float stars = stars(dir) * clamp(dot(dir, vec3(0, 1, 0)) * 2.2, 0.0, 1.0) * clamp(sunDown * 20.0, 0.0, 1.0);
    vec3 nightSky = nightColor * mix(0.04, 1.0, clamp(-getAltitudeAngle(cam, dir) - 0.09, 0.0, 1.0)) * clamp(sunDown * 5.0, 0.0, 1.0);
    vec3 night = vec3(stars) + nightSky;
    color += night;
}

#if defined(APPLY_COLOR_CORRECTION)
vec4 maybeApplyBiomesColorCorrection(in vec4 linear) {
    return applyBiomesColorCorrection(linear);
}
#else
vec4 maybeApplyBiomesColorCorrection(in vec4 linear) {
    return linear;
}
#endif

layout (location = 0) out vec4 finalColor;

void main() {
    float depth = texture(depth, vUv).r;
    float viewZ = -perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    vec3 cam = worldCameraPosition;

    // Calculate ray through this pixel
    // [(0,0), (1,1)] -> [(-1,-1), (1,1)]
    vec2 centeredUv = 2.0 * vUv - 1.0;
    float halfHeight = tan(radians(cameraFov / 2.0));
    float halfWidth = halfHeight * cameraAspect;
    vec3 cameraRight = normalize(cross(cameraForward, cameraUp));
    vec3 up = normalize(cross(cameraRight, cameraForward));
    vec3 normPlanePos = centeredUv.x * cameraRight * halfWidth +
        centeredUv.y * up * halfHeight +
        cameraForward;
    vec3 dir = normalize(normPlanePos);
    float viewDist = viewZ * length(normPlanePos);

    // Initialize the foreground color.
    vec4 fgColor = texture(color, vUv);

    // Add in secondary colors (i.e. water) to the foreground.
    vec4 secondaryColor = texture(secondaryColor, vUv);
    fgColor.rgb = mix(fgColor.rgb, secondaryColor.rgb, secondaryColor.a);
    fgColor.a = clamp(fgColor.a + secondaryColor.a, 0.0, 1.0);

    // Blend fog and sky
    SkyParams sky = SkyParams(sunColor, sunDirection, skyGroundOffset, skyHeightScale);
    FogParams fog = FogParams(fogStart, fogEnd);
    EnvironmentParams env = EnvironmentParams(muckyness, inWater);

    float sunDown = dot(sky.sunDir, vec3(0.0, -1.0, 0.0));

    // Compute the cloud color at this fragment.
    vec4 cloudColor;
    float cloudDepth;
    computeCloudColor(cam, dir, -sunDown, cloudColor, cloudDepth);

    // Blend environment coloring into the cloud color.
    cloudColor.rgb = mix(cloudColor.rgb, environmentColor(cloudColor.rgb, -sunDown, env), fogDensity(fog.start, fog.end, viewDist));

    // Compute the sky color at this fragment.
    vec3 skyColor;
    computeSkyColor(cam, dir, sunDown, skyColor);

    // Blend environment coloring into the sky color.
    skyColor = mix(skyColor, environmentColor(skyColor, -sunDown, env), 0.9);

    // Blend fog with the foreground color.
    fgColor = blendFog(fgColor, sky, fog, env, viewDist);

    // Blend the cloud color with the foreground accounting for occlusion.
    fgColor.rgb = mix(fgColor.rgb, cloudColor.rgb, fgColor.a * cloudColor.a * step(cloudDepth, viewDist));

    // Initialize the background color by blending clouds with the sky.
    vec3 bgColor = mix(skyColor, cloudColor.rgb, cloudColor.a);

    // Blend the background with the foreground.
    vec4 outColor = vec4(mix(fgColor.rgb, bgColor, 1.0 - fgColor.a), 1.0);

    float punchthrough = texture(punchthroughColor, vUv).r;

    // Assuming premultiplied alpha output.
    outColor = outColor * punchthrough;

    // Translucency is layered on top
    vec4 translucencyColor = texture(translucency, vUv);
    translucencyColor.rgb /= translucencyColor.a == 0.0 ? 1.0 : translucencyColor.a;
    outColor.rgb = mix(outColor.rgb, translucencyColor.rgb, translucencyColor.a);

    // Night LUT
    // blend in night quickly, right when sun goes down.
    float nightLutMix = clamp(sunDown * 3.0, 0.0, 1.0);
    // When we're in a cave, tone down the effect
    nightLutMix = mix(nightLutMix * 0.4, nightLutMix, playerSpatialLighting.y);
    // Tone down by luminance to maintain lights' colors
    float lum = luminance(outColor.rgb);
    nightLutMix *= clamp(1.0 - lum, 0.1, 1.0);
    // Tone down the effect when in lit areas
    float eyeAdaptation = clamp(remap(playerSpatialLighting.x, 0.2, 0.6, 1.0, 0.35), 0.4, 1.0);
    // Darken darker areas if we're lit
    outColor.rgb = pow(outColor.rgb, vec3(1.0 + clamp(0.5 * min(sunDown, 1.0 - eyeAdaptation), 0.0, 0.2)));

    nightLutMix *= eyeAdaptation;
    vec3 uvw = (outColor.bgr * float(nightLutSize - 1.0) + 0.5) / nightLutSize;
    outColor.rgb = mix(outColor.rgb, texture(nightLut, uvw).rgb, nightLutMix);

    // Apply both tonemapping and linear->srgb conversion.
    outColor = maybeApplyBiomesColorCorrection(outColor);

    finalColor = outColor;
}

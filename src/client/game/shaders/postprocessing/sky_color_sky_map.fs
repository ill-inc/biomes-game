#version 300 es

precision highp float;

uniform sampler2D skyColorTransmittanceLUT;
uniform sampler2D skyColorMultipleScatteringLUT;

    // Camera
uniform vec3 worldCameraPosition;

uniform vec3 sunDirection;
uniform float skyGroundOffset;
uniform float skyHeightScale;

in vec2 vUv;

#include "sky_constants.glsl"
#include "sky_functions.glsl"

layout (location = 0) out vec4 outColor;

const int numScatteringSteps = 32;
vec3 raymarchScattering(vec3 pos, vec3 rayDir, vec3 sunDir, float tMax, float numSteps) {
    float cosTheta = dot(rayDir, sunDir);
    float miePhaseValue = getMiePhase(cosTheta);
    float rayleighPhaseValue = getRayleighPhase(-cosTheta);

    vec3 lum = vec3(0.0);
    vec3 transmittance = vec3(1.0);
    float t = 0.0;
    for (float i = 0.0; i < numSteps; i += 1.0) {
        float newT = ((i + 0.3) / numSteps) * tMax;
        float dt = newT - t;
        t = newT;

        vec3 newPos = pos + t * rayDir;

        vec3 rayleighScattering, extinction;
        float mieScattering;
        getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);

        vec3 sampleTransmittance = exp(-dt * extinction);

        vec3 sunTransmittance = getValFromTLUT(skyColorTransmittanceLUT, newPos, sunDir);
        vec3 psiMS = getValFromMultiScattLUT(skyColorMultipleScatteringLUT, newPos, sunDir);

        vec3 rayleighInScattering = rayleighScattering * (rayleighPhaseValue * sunTransmittance + psiMS);
        vec3 mieInScattering = mieScattering * (miePhaseValue * sunTransmittance + psiMS);
        vec3 inScattering = (rayleighInScattering + mieInScattering);

        // Integrated scattering within path segment.
        vec3 scatteringIntegral = (inScattering - inScattering * sampleTransmittance) / extinction;

        lum += scatteringIntegral * transmittance;

        transmittance *= sampleTransmittance;
    }
    return lum;
}

void main() {
      // Convert from M to MM
    vec3 cam = (worldCameraPosition + vec3(0.0, skyGroundOffset, 0.0)) / 1000000.0 * skyHeightScale + vec3(0.0, groundRadiusMM, 0.0);
    cam.y = max(cam.y, groundRadiusMM + 0.0002);

    float azimuthAngle = (vUv.x - 0.5) * 2.0 * PI;
      // Non-linear mapping of altitude. See Section 5.3 of the paper.
    float adjV;
    if (vUv.y < 0.5) {
        float coord = 1.0 - 2.0 * vUv.y;
        adjV = -coord * coord;
    } else {
        float coord = vUv.y * 2.0 - 1.0;
        adjV = coord * coord;
    }

    float height = cam.y;
    vec3 up = vec3(0.0, 1.0, 0.0);

    float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height) - 0.5 * PI;
    float altitudeAngle = adjV * 0.5 * PI - horizonAngle;

    float cosAltitude = cos(altitudeAngle);
    vec3 rayDir = vec3(cosAltitude * sin(azimuthAngle), sin(altitudeAngle), -cosAltitude * cos(azimuthAngle));

    float sunAltitude = (0.5 * PI) - acos(dot(normalize(sunDirection), up));
      //sunAltitude = (0.5*PI) - acos(1.0);
    vec3 sunDir = vec3(0.0, sin(sunAltitude), -cos(sunAltitude));

    float atmoDist = rayIntersectSphere(cam, rayDir, atmosphereRadiusMM);
    float groundDist = rayIntersectSphere(cam, rayDir, groundRadiusMM);
    float tMax = (groundDist < 0.0) ? atmoDist : groundDist;
    vec3 lum = raymarchScattering(cam, rayDir, sunDir, tMax, float(numScatteringSteps));
    outColor = vec4(lum, 1.0);
}

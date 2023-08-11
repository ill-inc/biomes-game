#version 300 es

precision highp float;

in vec2 vUv;

#include "sky_constants.glsl"
#include "sky_functions.glsl"

const float sunTransmittanceSteps = 40.0;

layout (location = 0) out vec4 outColor;

vec3 getSunTransmittance(vec3 pos, vec3 sunDir) {
    if (rayIntersectSphere(pos, sunDir, groundRadiusMM) > 0.0) {
        return vec3(0.0);
    }

    float atmoDist = rayIntersectSphere(pos, sunDir, atmosphereRadiusMM);

    float t = 0.0;
    vec3 transmittance = vec3(1.0);
    for (float i = 0.0; i < sunTransmittanceSteps; i += 1.0) {
        float newT = ((i + 0.3) / sunTransmittanceSteps) * atmoDist;
        float dt = newT - t;
        t = newT;

        vec3 newPos = pos + t * sunDir;
        vec3 rayleighScattering, extinction;
        float mieScattering;
        getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
        transmittance *= exp(-dt * extinction);
    }
    return transmittance;
}

void main() {
    float sunCosTheta = 2.0 * vUv.x - 1.0;
    float sunTheta = safeacos(sunCosTheta);
    float height = mix(groundRadiusMM, atmosphereRadiusMM, vUv.y);
    vec3 pos = vec3(0.0, height, 0.0);
    vec3 sunDir = normalize(vec3(0.0, sunCosTheta, -sin(sunTheta)));

    outColor = vec4(getSunTransmittance(pos, sunDir), 1.0);
}
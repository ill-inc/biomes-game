#version 300 es

precision highp float;

    // Camera
uniform float cameraNear;
uniform float cameraFar;
uniform vec3 cameraUp;
uniform vec3 cameraForward;
uniform float cameraFov;
uniform float cameraAspect;
uniform vec3 worldCameraPosition;
uniform vec3 sunDirection;
uniform float skyGroundOffset;
uniform float skyHeightScale;
uniform sampler2D skyColorTransmittanceLUT;
uniform sampler2D skyColorMultipleScatteringLUT;
uniform sampler2D skyColorSkyMapLUT;
uniform sampler2D color;

in vec2 vUv;

#include "sky_constants.glsl"
#include "sky_functions.glsl"

layout (location = 0) out vec4 outColor;

vec3 getValFromSkyLUT(vec3 pos, vec3 rayDir, vec3 sunDir) {
    float height = groundRadiusMM + ((pos.y + skyGroundOffset) / 1000000.0 * skyHeightScale);
    height = max(height, groundRadiusMM + 0.0002);
    vec3 up = vec3(0.0, 1.0, 0.0);

    float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
    float altitudeAngle = horizonAngle - safeacos(dot(rayDir, up)); // Between -PI/2 and PI/2
    float azimuthAngle; // Between 0 and 2*PI
    if (abs(altitudeAngle) > (0.5 * PI - .0001)) {
        // Looking nearly straight up or down.
        azimuthAngle = 0.0;
    } else {
        vec3 right = cross(sunDir, up);
        vec3 forward = cross(up, right);

        vec3 projectedDir = normalize(rayDir - up * (dot(rayDir, up)));
        float sinTheta = dot(projectedDir, right);
        float cosTheta = dot(projectedDir, forward);
        azimuthAngle = atan(sinTheta, cosTheta) + PI;
    }

      // Non-linear mapping of altitude angle. See Section 5.3 of the paper.
    float v = 0.5 + 0.5 * sign(altitudeAngle) * sqrt(abs(altitudeAngle) * 2.0 / PI);
    vec2 uv = vec2(azimuthAngle / (2.0 * PI), v);

    return texture(skyColorSkyMapLUT, uv).rgb;
}

vec3 sunWithBloom(vec3 rayDir, vec3 sunDir) {
    const float sunSolidAngle = 0.53 * 3.14 / 180.0;
    const float minSunCosTheta = cos(sunSolidAngle);

    float cosTheta = dot(rayDir, sunDir);
    if (cosTheta >= minSunCosTheta)
        return vec3(1.0);

    float offset = minSunCosTheta - cosTheta;
    float gaussianBloom = exp(-offset * 50000.0) * 0.5;
    float invBloom = 1.0 / (0.02 + offset * 300.0) * 0.01;
    return vec3(gaussianBloom + invBloom);
}

void main() {
    outColor = vec4(0.0, 1.0, 0.0, 1.0);

      // visualize all 4 textures
    if (vUv.x < 0.5 && vUv.y < 0.5) {
        outColor = vec4(texture(skyColorTransmittanceLUT, vUv * 2.0).rgb / 10.0, 1.0);
    } else if (vUv.x < 0.5 && vUv.y > 0.5) {
        outColor = vec4(texture(skyColorMultipleScatteringLUT, vUv * 2.0 - vec2(0.0, 1.0)).rgb * 10.0, 1.0);
    } else if (vUv.x > 0.5 && vUv.y < 0.5) {
        outColor = vec4(texture(skyColorSkyMapLUT, vUv * 2.0 - vec2(1.0, 0.0)).rgb * 10.0, 1.0);
    } else {
        vec3 cam = worldCameraPosition;

        // Calculate ray through this pixel
        // [(0,0), (1,1)] -> [(-1,-1), (1,1)]
        vec2 centeredUv = 2.0 * (vUv * 2.0 - 1.0) - 1.0;
        float halfHeight = tan(radians(cameraFov / 2.0));
        float halfWidth = halfHeight * cameraAspect;
        vec3 cameraRight = normalize(cross(cameraForward, cameraUp));
        // double cross to force basis vectors to be perpendicular
        vec3 up = normalize(cross(cameraRight, cameraForward));
        vec3 normPlanePos = centeredUv.x * cameraRight * halfWidth +
            centeredUv.y * up * halfHeight +
            cameraForward;
        vec3 dir = normalize(normPlanePos);
        // sky
        vec3 sunDir = normalize(sunDirection);
        vec3 lum = getValFromSkyLUT(cam, dir, sunDir);
        lum += sunWithBloom(dir, sunDir) * step(0.0, sunDir.y) * getValFromTLUT(skyColorTransmittanceLUT, cam, sunDir);
        outColor = vec4(lum, 1.0);
    }

    outColor.rgb = mix(outColor.rgb, texture(color, vUv).rgb, 0.01);
}
#version 300 es

precision highp float;

#include "packing.glsl"

layout (location = 0) out vec4 fragcolor;

    // buffers
uniform sampler2D color;
uniform sampler2D depth;
uniform sampler2D normal;

    // camera parameters
uniform float zNear;
uniform float zFar;
uniform float cameraFov;
uniform float cameraAspect;

uniform float strength;
uniform float lightening;

    // screen
uniform vec2 resolution;
in vec2 vUv;

    // screen uv -> view-space position via depth
vec3 getPosition(vec2 uv) {
    float z = perspectiveDepthToViewZ(texture(depth, uv).r, zNear, zFar);
    vec2 centeredUv = 2.0 * uv - 1.0;
    float halfHeight = tan(radians(cameraFov / 2.0));
    float halfWidth = halfHeight * cameraAspect;
      // do view adjusted space:
    vec3 viewPlanePos = centeredUv.x * vec3(1.0, 0.0, 0.0) * halfWidth +
        centeredUv.y * vec3(0.0, 1.0, 0.0) * halfHeight +
        vec3(0.0, 0.0, 1.0);
    return viewPlanePos * z;
}

    // old internet one liner
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

    // ssao implementation adatped from nathaniel meyer @
    // http://devmaster.net/posts/3095/shader-effects-screen-space-ambient-occlusion (now offline)
    // with a modified MIT License.
    // TODO: use a spiral kernel, consider GTAO
float OccluderBias = 0.1;
float SamplingRadius = 12.0;
vec2 Attenuation = vec2(1.0, 1.0);

float SamplePixels(vec3 srcPosition, vec3 srcNormal, vec2 uv) {
      // Get the 3D position of the destination pixel
    vec3 dstPosition = getPosition(uv);

      // Calculate ambient occlusion amount between these two points
      // It is simular to diffuse lighting. Objects directly above the fragment cast
      // the hardest shadow and objects closer to the horizon have minimal effect.
    vec3 positionVec = dstPosition - srcPosition;

    float bias = OccluderBias;

    float intensity = max(dot(normalize(positionVec), -srcNormal) - bias, 0.0);

      // Attenuate the occlusion, similar to how you attenuate a light source.
      // The further the distance between points, the less effect AO has on the fragment.
    float dist;
    dist = length(positionVec) / SamplingRadius;
      // adjust attenuation dist when close to mitigate player halo
    float attenuation = 1.0 / clamp(Attenuation.x + Attenuation.y * dist, 0.01, 1.0);

    return intensity * attenuation;
}

float ComputeOcclusion(vec2 tc, vec3 srcNormal) {
      // Get position and normal vector for this fragment
    vec3 srcPosition = getPosition(tc);
    vec2 randVec = normalize(vec2(rand(tc * 20.0), rand(tc * 20.0 + 1.0)));

      // The following variable specifies how many pixels we skip over after each
      // iteration in the ambient occlusion loop. We can't sample every pixel within
      // the sphere of influence because that's too slow. We only need to sample
      // some random pixels nearby to apprxomate the solution.
    float kernelRadius = SamplingRadius;

      // Sample neighbouring pixels
    vec2 kernel[4];
    kernel[0] = vec2(0.0, 1.0); // top
    kernel[1] = vec2(1.0, 0.0); // right
    kernel[2] = vec2(0.0, -1.0);    // bottom
    kernel[3] = vec2(-1.0, 0.0);    // left

    const float Sin45 = 0.707107;   // 45 degrees = sin(PI / 4)

      // Sample from 16 pixels, which should be enough to appromixate a result. You can
      // sample from more pixels, but it comes at the cost of performance.
    float occlusion = 0.0;
    vec2 TexelSize = 1.0 / resolution;
    for (int i = 0; i < 4; ++i) {
        vec2 k1 = reflect(kernel[i], randVec);
        vec2 k2 = vec2(k1.x * Sin45 - k1.y * Sin45, k1.x * Sin45 + k1.y * Sin45);
        k1 *= TexelSize;
        k2 *= TexelSize;

        occlusion += SamplePixels(srcPosition, srcNormal, tc + k1 * kernelRadius);
        occlusion += SamplePixels(srcPosition, srcNormal, tc + k2 * kernelRadius * 0.75);
        occlusion += SamplePixels(srcPosition, srcNormal, tc + k1 * kernelRadius * 0.5);
        occlusion += SamplePixels(srcPosition, srcNormal, tc + k2 * kernelRadius * 0.25);
    }

      // Average and clamp ambient occlusion
    occlusion /= 16.0;
    return clamp(occlusion, 0.0, 1.0);
}

void main() {
    vec3 norm = texture(normal, vUv).rgb;
    float light = 1.0 - ComputeOcclusion(vUv, norm);
      // take the dark parts, clamp bright parts, and adjust strength to mitigate halo
    light = pow(clamp(light * lightening, 0.0, 1.0), strength);
    vec4 prevColor = texture(color, vUv);
    fragcolor = vec4(light * prevColor.rgb, prevColor.a);
}

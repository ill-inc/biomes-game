#version 300 es

precision highp float;

    #include "packing.glsl"

    // Textures
uniform sampler2D color;
uniform sampler2D depth;
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

    // TODO all of these params below can be moved to consts to save on uniform costs
    // once we tune them all
    // Fog
uniform float fogStart;
uniform float fogEnd;
uniform float cloudFogStart;
uniform float cloudFogEnd;
    // Cloud
uniform float timeScale;
uniform float cloudScale;
uniform float poofScale;
uniform vec4 cloudColor;
uniform vec3 cloudOffsetColor;
uniform float planeOffset;
uniform float planeHeight;
uniform float cloudiness;
uniform float cloudDensity;
    // Sky
uniform vec3 skyColor;

// Increase for quality, decrease for performance
#define MAX_STEPS 32

layout (location = 0) out vec4 outColor;

// Fractal Brownian Motion from https://www.shadertoy.com/view/lss3zr
mat3 m = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);

    f = f * f * (3.0 - 2.0 * f);

    float n = p.x + p.y * 57.0 + 113.0 * p.z;

    float res = mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y), mix(mix(hash(n + 113.0), hash(n + 114.0), f.x), mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    return res;
}

float fbm(vec3 p) {
    float f;
    f = 0.5000 * noise(p);
    p = m * p * 2.02;
    f += 0.2500 * noise(p);
    p = m * p * 2.03;
    f += 0.1250 * noise(p);
    p = m * p * 2.01;
    f += 0.0625 * noise(p);
    return f;
}

    // Sample cloud density at give point p
    // modulate by yheight and yspan for layer of clouds
float map(vec3 p, float yHeight, float ySpan) {
    float f = fbm((p * -vec3(0.5, 0.5, 1.0) * time * timeScale * .25) * poofScale * 0.01);

      // vertical shape
    float heightDist = abs((p.y - yHeight) / ySpan);
    float heightLimited = (1.0 - heightDist) + f;

      // x,z shape
    float periodic = fbm(p * 0.05 * cloudScale + vec3(.0, 1.0, 0.5) * time * timeScale * 0.02) * cloudiness;
    heightLimited -= periodic;

    return min(max(0.0, heightLimited), 1.0);
}

    // March ray p+rt, from tmin to tmax.
    // modulate cloud density by zSpan centered at zHeight
    // existingDepth is existing z depth fddor any object intersections
vec4 cloudMarch(vec3 p, vec3 r, float tmin, float tmax, float zHeight, float zSpan, float existingDepth) {
    float rayDist = tmax - tmin;
    float density = 0.0;
    float stepLen = (tmax - tmin) / float(MAX_STEPS) / 2.0;

    float adjustedCloudDensity = cloudDensity * zSpan / rayDist;

    vec4 sum = vec4(vec3(0., 0.0, 0.), 1.);
    for (int i = 0; i < MAX_STEPS; i++) {
        float t = tmin + stepLen * float(i);
        vec3 pos = p + r * t;
        if (sum.a < .1) {
          // Fully opaque
            break;
        }
        if (t > existingDepth) {
          // Hit an object
          //break;
        }

        float d = map(pos, zHeight, zSpan);
        if (d > 0.001) {
            density = clamp((d / float(MAX_STEPS)) * adjustedCloudDensity * stepLen, 0.0, 1.0) * (1.0 - clamp((t - cloudFogStart) / (cloudFogEnd - cloudFogStart), 0.0, 1.0));
            sum.rgb += cloudColor.rgb * (sum.a * density);
            sum.a *= 1.0 - density;
            sum.rgb += exp(-map(pos + vec3(0, 0.25, 0.0), zSpan, zHeight) * .2) * density * skyColor / 2.0 * sum.a;
        }
    }
    return sum;
}

void main() {
    float depth = texture(depth, vUv).r;
    float viewZ = -perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    vec3 color = texture(color, vUv).rgb;

    vec3 cam = worldCameraPosition;

      // Calculate ray through this pixel
      // [(0,0), (1,1)] -> [(-1,-1), (1,1)]
    vec2 centeredUv = 2.0 * vUv - 1.0;
    float halfHeight = tan(radians(cameraFov / 2.0));
    float halfWidth = halfHeight * cameraAspect;
    vec3 cameraRight = normalize(cross(cameraForward, cameraUp));
    vec3 dir = normalize(centeredUv.x * cameraRight * halfWidth +
        centeredUv.y * cameraUp * halfHeight +
        cameraForward);

      // Clouds: line plane intersection against 2 planes, sharing the same normal
    vec3 planeN = vec3(0.0, 1.0, 0.0);
    vec3 planePos = vec3(0.0, planeHeight, 0.0);
    vec3 planeToCam = cam - planePos;
    float det = -dot(dir, planeN);

    vec3 backgroundColor = skyColor;
    color = mix(color, backgroundColor, clamp((viewZ - fogStart) / (fogEnd - fogStart), 0.0, 1.0));

    outColor = vec4(color, 1.0);

      // Compute clouds
      // Find closest plane
    float cloudMid = planeHeight + planeOffset / 2.0;
    float rawTmin = dot(planeN, cam - vec3(0.0, planeHeight, 0.0)) / det;
    float rawTmax = dot(planeN, cam - vec3(0.0, planeHeight + planeOffset, 0.0)) / det;
    float tmax = rawTmin < rawTmax ? rawTmax : rawTmin;
    float tmin = rawTmin < rawTmax ? rawTmin : rawTmax;

      // Draw clouds behind things, but past max depth, draw all clouds
    float cloudOccl = clamp(step(tmin, viewZ) + step(cameraFar - 0.1, viewZ), 0.0, 1.0);
      // Get rid of reverse plane hits
    if (tmax < 0.0 && tmin < 0.0) {
        cloudOccl = 0.0;
    }
      // Get rid of in-between plane hit starting at plane hit
    tmin = max(tmin, 0.0);
      // remove in-cloud singularity
    tmax = clamp(tmax, tmin + 1.0, tmin + 200.0);

    vec4 marchedClouds = cloudMarch(cam, dir, tmin, tmax, cloudMid, planeOffset, viewZ);
    float cloudBlend = 1.0 - marchedClouds.a;
    vec3 mixedColor = mix(color, marchedClouds.rgb, cloudBlend * cloudBlend * cloudOccl);
    outColor.rgb = mixedColor;
}

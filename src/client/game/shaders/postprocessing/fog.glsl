struct SkyParams {
    vec3 sunColor;
    vec3 sunDir;
    float groundOffset;
    float heightScale;
};

float fogDensity(float start, float end, float distance) {
    return clamp((distance - start) / (end - start), 0.0, 1.0);
}

vec3 darkenByNight(vec3 color, float sunUp, float darken) {
    return mix(darken * color, color, clamp(7.0 * sunUp, 0.0, 1.0));
}

struct EnvironmentParams {
    float muckyness;
    int inWater;
};

vec3 waterColor = vec3(0.02, 0.08, 0.18);
vec3 muckInAirColor = vec3(0.42, 0.28, 0.6);
vec3 muckInWaterColor = vec3(0.05, 0.18, 0.1);

vec3 environmentColor(vec3 baseColor, float sunUp, EnvironmentParams env) {
    vec3 ret = baseColor;
    if (env.inWater == 1) {
        ret = darkenByNight(waterColor, sunUp, 0.035);
    }
    if (env.muckyness > 0.0) {
        vec3 muckColor = env.inWater == 1 ? muckInWaterColor : muckInAirColor;
        float intensity = mix(1.0, 0.5, clamp(10.0 * sunUp, 0.0, 1.0)) * env.muckyness / 15.0;
        ret = mix(ret, darkenByNight(muckColor, sunUp, 0.035), intensity);
    }
    return ret;
}

struct FogParams {
    float start;
    float end;
};

vec3 fogColor = vec3(0.27, 0.49, 0.87);

vec4 blendFog(vec4 fgColor, SkyParams sky, FogParams fog, EnvironmentParams env, float dist) {
    float sunDown = dot(sky.sunDir, vec3(0.0, -1.0, 0.0));

    // Blend fog with the foreground color.
    fgColor.rgb = mix(fgColor.rgb, darkenByNight(fogColor, -sunDown, 0.02), fogDensity(fog.start, fog.end, dist));

    // Blend environment-dependent fog into the foreground color.
    fgColor.rgb = mix(fgColor.rgb, environmentColor(fgColor.rgb, -sunDown, env), fogDensity(0.0, fog.end, 4.0 * dist));
    fgColor.a *= 1.0 - clamp(fogDensity(fog.end - 10.0, fog.end, dist), 0.0, 1.0);
    return fgColor;
}

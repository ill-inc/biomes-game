struct FloraMaterialProperties {
  uint isWilting;
  uint muck;
  uint rotationType;
  uint windType;
};

FloraMaterialProperties getFloraMaterialProperties(highp usampler2D materialData, uint rank) {
  uint packedProperties = readBuffer(materialData, rank);
  FloraMaterialProperties props;
  props.isWilting = packedProperties & 1u;
  props.muck = (packedProperties >> 1u) & 0xffu;
  props.rotationType = (packedProperties >> 9u) & 0x3u;
  props.windType = (packedProperties >> 11u) & 0x3u;
  return props;
}

struct BlockMaterialProperties {
  bool isWilting;
  uint muck;
};

BlockMaterialProperties readBlockMaterialProperties(highp usampler2D materialData, uint rank) {
  uint packedProperties = readBuffer(materialData, rank);
  BlockMaterialProperties props;
    // Must match voxeloo/galois/terrain_flags.hpp
  props.isWilting = (packedProperties & (1u << 0)) != 0u;
  props.muck = (packedProperties >>= 1u) & 0xffu;
  return props;
}

const vec3 wiltingColor = vec3(120. / 255., 45. / 255., 0.) * 1.5;
const float wiltingColorIntensity = 0.85;
const vec3 baseWiltingColor = mix(vec3(1.), wiltingColor, wiltingColorIntensity);

vec3 floraWiltingColor(vec3 color) {
  float lum = luminance(color);
  return mix(baseWiltingColor * lum, color, 0.1);
}

vec3 blockWiltingColor(vec3 color) {
  float lum = luminance(color);
  return mix(baseWiltingColor * lum, color, 0.1);
}

const vec3 blockMuckBaseColor = vec3(0.65f, 0.18f, 1.0f);
const float blockMuckStart = 32.0;
const float blockMuckFadeLength = 2.0;
const float blockMuckBlendMin = 0.0;
const float blockMuckBlendMax = 0.3;

vec3 blockMuckColor(vec3 color, uint blockMuck) {
  float lum = luminance(color);
  return mix(color, blockMuckBaseColor * lum, (blockMuckBlendMax - blockMuckBlendMin) * smoothstep(blockMuckStart, blockMuckStart + blockMuckFadeLength, float(blockMuck)) + blockMuckBlendMin);
}

const vec3 floraMuckBaseColor = vec3(0.65f, 0.18f, 1.0f);
const float floraMuckStart = 32.0;
const float floraMuckFadeLength = 2.0;
const float floraMuckBlendMin = 0.0;
const float floraMuckBlendMax = 0.0;

vec3 floraMuckColor(vec3 color, uint floraMuck) {
  float lum = luminance(color);
  return mix(color, floraMuckBaseColor * lum, (floraMuckBlendMax - floraMuckBlendMin) * smoothstep(floraMuckStart, floraMuckStart + floraMuckFadeLength, float(floraMuck)) + floraMuckBlendMin);
}

struct WaterMaterialProperties {
  uint muck;
};

WaterMaterialProperties getWaterMaterialProperties(highp usampler2D materialData, uint rank) {
  uint packedProperties = readBuffer(materialData, rank);
  WaterMaterialProperties props;
  props.muck = packedProperties & 0xfu;
  return props;
}

// A custom popcount, as the instrinsic requires WebGL >= 3.1.
// NOTE: LUT approaches seem to cause crazy warp divergence on some GPUs. As a
// work-around, we use a little bit trick here (see: tinyurl.com/46kndusm).
uint popcount(uint x) {
  uint ret = 0u;
  ret = x - ((x >> 1u) & 0x55555555u);
  ret = ((ret >> 2u) & 0x33333333u) + (ret & 0x33333333u);
  ret = ((ret >> 4u) + ret) & 0x0F0F0F0Fu;
  ret = ((ret >> 8u) + ret) & 0x00FF00FFu;
  ret = ((ret >> 16u) + ret) & 0x0000FFFFu;
  return ret;
}

uint onetrail(uint offset) {
  return (1u << offset) - 1u;
}

uint getRank(in highp usampler2D rankBuffer, uvec3 pos) {
  uint offset = 0u;
  uint mask = 0xffffffffu;

  uint y_cumsum = readBuffer(rankBuffer, offset);
  uint y_bucket = readBuffer(rankBuffer, offset + 1u);
  offset = y_cumsum + popcount(y_bucket & onetrail(mask & pos.y));
  offset <<= 1u;
  if ((y_bucket & (1u << pos.y)) == 0u) {
    mask = 0u;
  }

  uint z_cumsum = readBuffer(rankBuffer, offset);
  uint z_bucket = readBuffer(rankBuffer, offset + 1u);
  offset = z_cumsum + popcount(z_bucket & onetrail(mask & pos.z));
  offset <<= 1u;
  if ((z_bucket & (1u << pos.z)) == 0u) {
    mask = 0u;
  }

  uint x_cumsum = readBuffer(rankBuffer, offset);
  uint x_bucket = readBuffer(rankBuffer, offset + 1u);
  return x_cumsum + popcount(x_bucket & onetrail(mask & pos.x));
}

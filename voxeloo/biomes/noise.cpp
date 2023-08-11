#include "voxeloo/biomes/noise.hpp"

namespace voxeloo::noise {

SimplexNoise::SimplexNoise(uint32_t seed) : noise_(seed) {}

float SimplexNoise::get(float x, float y) const {
  return static_cast<float>(noise_.eval(x, y));
}

float SimplexNoise::get(float x, float y, float z) const {
  return static_cast<float>(noise_.eval(x, y, z));
}

float SimplexNoise::get(float x, float y, float z, float w) const {
  return static_cast<float>(noise_.eval(x, y, z, w));
}

// Default global noise function used for
static const SimplexNoise kDefaultNoise(1);

float simplex_noise(float x, float y) {
  return kDefaultNoise.get(x, y);
}

float simplex_noise(float x, float y, float z) {
  return kDefaultNoise.get(x, y, z);
}

float simplex_noise(float x, float y, float z, float w) {
  return kDefaultNoise.get(x, y, z, w);
}

}  // namespace voxeloo::noise

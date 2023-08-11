#pragma once

#include "OpenSimplexNoise.h"

namespace voxeloo::noise {

class SimplexNoise {
 public:
  explicit SimplexNoise(uint32_t seed);

  float get(float x, float y) const;
  float get(float x, float y, float z) const;
  float get(float x, float y, float z, float w) const;

 private:
  OpenSimplexNoise::Noise noise_;
};

float simplex_noise(float x, float y);
float simplex_noise(float x, float y, float z);
float simplex_noise(float x, float y, float z, float w);

}  // namespace voxeloo::noise

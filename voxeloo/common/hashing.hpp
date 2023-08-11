#pragma once

#include "voxeloo/common/geometry.hpp"

namespace voxeloo {

inline uint32_t random_hash(uint32_t x) {
  x ^= x >> 16;
  x *= 0x7feb352dul;
  x ^= x >> 15;
  x *= 0x846ca68bul;
  x ^= x >> 16;
  return x;
}

inline uint32_t position_hash(Vec2u pos) {
  return random_hash(pos.x + random_hash(pos.y));
}

inline uint32_t position_hash(Vec3u pos) {
  return random_hash(pos.x + random_hash(pos.y + random_hash(pos.z)));
}

inline uint32_t position_hash(Vec2i pos) {
  return random_hash(pos.x + random_hash(pos.y));
}

inline uint32_t position_hash(Vec3i pos) {
  return random_hash(pos.x + random_hash(pos.y + random_hash(pos.z)));
}

}  // namespace voxeloo
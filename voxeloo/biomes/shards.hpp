#pragma once

#include <algorithm>
#include <cstdint>
#include <tuple>
#include <vector>

#include "voxeloo/common/frustum.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo::shards {

struct ShardPos {
  uint8_t level;
  Vec3i pos;
};

inline bool operator==(const ShardPos& a, const ShardPos& b) {
  return a.level == b.level && a.pos == b.pos;
}

template <typename ShardId>
inline auto shard_decode(const ShardId& code) {
  int n = static_cast<int>(code.size());
  CHECK_ARGUMENT(n > 0);
  CHECK_ARGUMENT(n % 3 == 1);

  uint32_t head = static_cast<uint8_t>(code[0]);
  ShardPos ret{static_cast<uint8_t>(head & 0x1f), {0, 0, 0}};
  for (int i = n - 1; i >= 1;) {
    ret.pos.z = (ret.pos.z << 8) | static_cast<uint8_t>(code[i--]);
    ret.pos.y = (ret.pos.y << 8) | static_cast<uint8_t>(code[i--]);
    ret.pos.x = (ret.pos.x << 8) | static_cast<uint8_t>(code[i--]);
  }
  ret.pos.x = (head & 0x80) ? -ret.pos.x : ret.pos.x;
  ret.pos.y = (head & 0x40) ? -ret.pos.y : ret.pos.y;
  ret.pos.z = (head & 0x20) ? -ret.pos.z : ret.pos.z;
  return ret;
}

template <typename ShardId = std::string>
inline auto shard_encode(const ShardPos& pos) {
  CHECK_ARGUMENT(pos.level < 32);

  ShardId id;
  id.resize(1 + 3 * sizeof(int32_t));
  id[0] = pos.level & 0x1f;
  id[0] |= pos.pos.x < 0 ? 0x80 : 0;
  id[0] |= pos.pos.y < 0 ? 0x40 : 0;
  id[0] |= pos.pos.z < 0 ? 0x20 : 0;

  size_t size = 1;
  int x = std::abs(pos.pos.x);
  int y = std::abs(pos.pos.y);
  int z = std::abs(pos.pos.z);
  CHECK_ARGUMENT(x < 100000 && y < 100000 && z < 100000);
  while (x != 0 || y != 0 || z != 0) {
    id[size++] = static_cast<uint8_t>(x & 0xff);
    id[size++] = static_cast<uint8_t>(y & 0xff);
    id[size++] = static_cast<uint8_t>(z & 0xff);
    x >>= 8;
    y >>= 8;
    z >>= 8;
  }
  id.resize(size);
  return id;
}

inline auto shard_div(uint32_t level, int32_t x, int32_t y, int32_t z) {
  auto dim = 1 << level;
  return Vec3i{
      x < 0 ? (x + 1) / dim - 1 : x / dim,
      y < 0 ? (y + 1) / dim - 1 : y / dim,
      z < 0 ? (z + 1) / dim - 1 : z / dim,
  };
}

inline auto shard_div(uint32_t level, Vec3i pos) {
  return shard_div(level, pos.x, pos.y, pos.z);
}

inline auto shard_mul(uint32_t level, int32_t x, int32_t y, int32_t z) {
  return (1 << level) * vec3(x, y, z);
}

inline auto shard_mul(uint32_t level, Vec3i pos) {
  return shard_mul(level, pos.x, pos.y, pos.z);
}

inline auto to_shard_and_local(uint32_t level, Vec3i pos) {
  auto shard = shard_div(level, pos);
  auto local = to<uint32_t>(pos - (1 << level) * shard);
  return std::tuple{shard, local};
}

static constexpr uint32_t kBlockLvl = 5;
static constexpr uint32_t kBlockDim = 1 << 5;
static constexpr uint32_t kMaxBlockSize = kBlockDim * kBlockDim * kBlockDim;

inline auto block_decode(uint32_t code) {
  return spatial::block_decode<kBlockDim>(code);
}

inline auto block_encode(uint32_t x, uint32_t y, uint32_t z) {
  return spatial::block_encode<kBlockDim>(x, y, z);
}

inline auto block_encode(Vec3u pos) {
  return block_encode(pos.x, pos.y, pos.z);
}

inline auto block_partition(Vec3i pos) {
  return to_shard_and_local(kBlockLvl, pos);
}

class FrustumSharder {
 public:
  explicit FrustumSharder(uint32_t level)
      : level_(static_cast<uint8_t>(level)) {}

  std::vector<Vec3i> get_positions(
      Vec3d origin, Vec3d view, const Mat4x4d& view_proj);

 private:
  uint8_t level_;
};

}  // namespace voxeloo::shards

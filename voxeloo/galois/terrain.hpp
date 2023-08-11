#pragma once

#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::terrain {

using TerrainId = uint32_t;
using Tensor = tensors::Tensor<TerrainId>;

static constexpr TerrainId kBlockHeader = 0x00;
static constexpr TerrainId kFloraHeader = 0x01;
static constexpr TerrainId kGlassHeader = 0x02;

inline auto is_valid_block_id(uint32_t id) {
  return 0 < id && id < (1 << 24);
}

inline auto is_valid_flora_id(uint32_t id) {
  return 0 < id && id < (1 << 24);
}

inline auto is_valid_glass_id(uint32_t id) {
  return 0 < id && id < (1 << 24);
}

// Keep in sync with src/shared/game/ids.ts isBlockId
inline auto is_block_id(TerrainId id) {
  return id != 0 && (id >> 24) == kBlockHeader;
}

// Keep in sync with src/shared/game/ids.ts isFloraId
inline auto is_flora_id(TerrainId id) {
  return (id >> 24) == kFloraHeader;
}

// Keep in sync with src/shared/game/ids.ts isGlassId
inline auto is_glass_id(TerrainId id) {
  return (id >> 24) == kGlassHeader;
}

// Keep in sync with src/shared/game/ids.ts fromBlockId
inline auto from_block_id(TerrainId id) {
  return (kBlockHeader << 24) | id;
}

// Keep in sync with src/shared/game/ids.ts fromFloraId
inline auto from_flora_id(TerrainId id) {
  return (kFloraHeader << 24) | id;
}

// Keep in sync with src/shared/game/ids.ts fromGlassId
inline auto from_glass_id(TerrainId id) {
  return (kGlassHeader << 24) | id;
}

// Keep in sync with src/shared/game/ids.ts toBlockId
inline auto to_block_id(TerrainId id) {
  return id & 0xffffff;
}

// Keep in sync with src/shared/game/ids.ts toFloraId
inline auto to_flora_id(TerrainId id) {
  return id & 0xffffff;
}

// Keep in sync with src/shared/game/ids.ts toGlassId
inline auto to_glass_id(TerrainId id) {
  return id & 0xffffff;
}

inline auto to_blocks(const Tensor& tensor) {
  return tensors::map_values(tensor, [](auto val) -> TerrainId {
    return is_block_id(val) ? to_block_id(val) : 0;
  });
}

inline auto to_florae(const Tensor& tensor) {
  return tensors::map_values(tensor, [](auto val) -> TerrainId {
    return is_flora_id(val) ? to_flora_id(val) : 0;
  });
}

inline auto to_glass(const Tensor& tensor) {
  return tensors::map_values(tensor, [](auto val) -> TerrainId {
    return is_glass_id(val) ? to_glass_id(val) : 0;
  });
}

inline bool is_collidable(TerrainId id) {
  return is_block_id(id) || is_glass_id(id);
}

}  // namespace voxeloo::galois::terrain

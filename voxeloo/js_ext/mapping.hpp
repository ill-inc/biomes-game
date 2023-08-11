#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <unordered_set>

#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/mapping/heights.hpp"

namespace voxeloo::mapping::js {

template <typename Val>
using BufferJs = buffers::js::BufferJs<Val>;

struct VoxelIdSet {
  std::unordered_set<uint32_t> ids;

  void add(uint32_t id) {
    ids.insert(id);
  }
};

template <typename T>
inline auto to_typed_array(Array2<T>& array) {
  auto cnt = array.data.size();
  auto ptr = &array.data[0];
  return emscripten::val(emscripten::typed_memory_view(cnt, ptr));
}

class HeightsJs {
 public:
  explicit HeightsJs(Heights heights) : impl_(std::move(heights)) {}

  auto block() {
    return to_typed_array(impl_.block);
  }

  auto flora() {
    return to_typed_array(impl_.flora);
  }

  auto water() {
    return to_typed_array(impl_.water);
  }

  auto muck() {
    return to_typed_array(impl_.muck);
  }

 private:
  Heights impl_;
};

class HeightsBuilderJs {
 public:
  explicit HeightsBuilderJs(
      Vec3i origin,
      Vec2u shape,
      VoxelIdSet block_filter,
      VoxelIdSet flora_filter)
      : impl_(
            origin,
            shape,
            std::move(block_filter.ids),
            std::move(flora_filter.ids)) {}

  auto load_terrain(Vec3i pos, const tensors::Tensor<uint32_t>& terrain) {
    impl_.load_terrain(pos, terrain);
  }

  auto load_water(Vec3i pos, const tensors::Tensor<uint8_t>& water) {
    impl_.load_water(pos, water);
  }

  auto load_muck(Vec3i pos, const tensors::Tensor<uint8_t>& muck) {
    impl_.load_muck(pos, muck);
  }

  auto build() {
    return HeightsJs(impl_.build());
  }

 private:
  HeightsBuilder impl_;
};

inline void bind() {
  namespace em = emscripten;

  em::class_<VoxelIdSet>("VoxelIdSet")
      .constructor()
      .function("add", &VoxelIdSet::add);

  em::class_<HeightsJs>("MapHeights")
      .function("block", &HeightsJs::block)
      .function("flora", &HeightsJs::flora)
      .function("muck", &HeightsJs::muck)
      .function("water", &HeightsJs::water);
  em::class_<HeightsBuilderJs>("MapHeightsBuilder")
      .constructor<Vec3i, Vec2u, VoxelIdSet, VoxelIdSet>()
      .function("loadTerrain", &HeightsBuilderJs::load_terrain)
      .function("loadWater", &HeightsBuilderJs::load_water)
      .function("loadMuck", &HeightsBuilderJs::load_muck)
      .function("build", &HeightsBuilderJs::build);
}

}  // namespace voxeloo::mapping::js

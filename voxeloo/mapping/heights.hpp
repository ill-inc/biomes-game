#pragma once

#include <memory>
#include <optional>
#include <unordered_set>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/mapping/util.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::mapping {

struct Heights {
  Array2<int> block;
  Array2<int> flora;
  Array2<int> water;
  Array2<int> muck;

  explicit Heights(const Vec2u& shape)
      : block(shape), flora(shape), water(shape), muck(shape) {}
};

class HeightsBuilder {
 public:
  HeightsBuilder(
      const Vec3i& origin,
      const Vec2u& shape,
      std::unordered_set<uint32_t> block_filter,
      std::unordered_set<uint32_t> flora_filter)
      : origin_(origin),
        heights_(shape),
        block_filter_(std::move(block_filter)),
        flora_filter_(std::move(flora_filter)) {}

  void load_terrain(Vec3i pos, const tensors::Tensor<uint32_t>& terrain);
  void load_water(Vec3i pos, const tensors::Tensor<uint8_t>& water);
  void load_muck(Vec3i pos, const tensors::Tensor<uint8_t>& muck);
  Heights build();

 private:
  Vec3i origin_;
  Heights heights_;
  std::unordered_set<uint32_t> block_filter_;
  std::unordered_set<uint32_t> flora_filter_;
};

}  // namespace voxeloo::mapping
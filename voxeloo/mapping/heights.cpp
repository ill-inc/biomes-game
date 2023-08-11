#include "voxeloo/mapping/heights.hpp"

#include <memory>
#include <optional>
#include <unordered_set>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/mapping/util.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::mapping {

void HeightsBuilder::load_terrain(
    Vec3i pos, const tensors::Tensor<uint32_t>& terrain) {
  tensors::scan_sparse(terrain, [&](auto offset, auto id) {
    auto [x, y, z] = pos + to<int>(offset) - origin_;
    CHECK_ARGUMENT(x >= 0 && x < heights_.block.shape[0]);
    CHECK_ARGUMENT(z >= 0 && z < heights_.block.shape[1]);
    auto ij = to<unsigned int>(vec2(x, z));
    if (galois::terrain::is_block_id(id)) {
      if (block_filter_.count(id)) {
        heights_.block.set(ij, std::max(heights_.block.get(ij), y + 1));
      }
    } else if (galois::terrain::is_flora_id(id)) {
      if (flora_filter_.count(id)) {
        heights_.flora.set(ij, std::max(heights_.flora.get(ij), y + 1));
      }
    }
  });
}

void HeightsBuilder::load_water(
    Vec3i pos, const tensors::Tensor<uint8_t>& water) {
  tensors::scan_sparse(water, [&](auto offset, auto id) {
    auto [x, y, z] = pos + to<int>(offset) - origin_;
    CHECK_ARGUMENT(x >= 0 && x < heights_.block.shape[0]);
    CHECK_ARGUMENT(z >= 0 && z < heights_.block.shape[1]);
    auto ij = to<unsigned int>(vec2(x, z));
    heights_.water.set(ij, std::max(heights_.water.get(ij), y + 1));
  });
}

void HeightsBuilder::load_muck(
    Vec3i pos, const tensors::Tensor<uint8_t>& muck) {
  tensors::scan_sparse(muck, [&](auto offset, auto id) {
    auto [x, y, z] = pos + to<int>(offset) - origin_;
    CHECK_ARGUMENT(x >= 0 && x < heights_.muck.shape[0]);
    CHECK_ARGUMENT(z >= 0 && z < heights_.muck.shape[1]);
    auto ij = to<unsigned int>(vec2(x, z));
    heights_.muck.set(ij, std::max(heights_.muck.get(ij), y + 1));
  });
}

Heights HeightsBuilder::build() {
  return heights_;
}

}  // namespace voxeloo::mapping
#include <catch2/catch.hpp>

#include "voxeloo/biomes/biomes.hpp"

namespace voxeloo {

TEST_CASE("Benchmark compute_light_map", "[all]") {
  using namespace voxeloo::biomes;  // NOLINT
  using namespace voxeloo::shards;  // NOLINT

  VolumeBlock<Material> block;
  for (size_t x = 0; x < kBlockDim; x += 1) {
    for (size_t z = 0; z < kBlockDim; z += 1) {
      auto h = std::rand() % kBlockDim;
      for (size_t y = 0; y < h; y += 1) {
        block.set(x, y, z, 1);
      }
    }
  }

  auto occlusion_fn = [&](int x, int y, int z) {
    static const auto box = voxels::cube_box(kBlockDim);
    if (voxels::box_contains(box, {x, y, z})) {
      return block.get(x, y, z) != 0;
    }
    return false;
  };

  auto make_mesh = [&]() {
    return to_compact_mesh(
        block, {0, 0, 0}, occlusion_fn, [&](Material mat, voxels::Dir dir) {
          return mat;
        });
  };

  BENCHMARK("to_compact_mesh") {
    make_mesh();
  };

  auto mesh = make_mesh();
  BENCHMARK("compute_light_map") {
    compute_light_map(mesh, occlusion_fn, [&](uint8_t mask) {
      return static_cast<float>(mask) / 255.0f;
    });
  };
};

TEST_CASE("Benchmark block deserialization", "[all]") {
  using namespace voxeloo::biomes;  // NOLINT
  using namespace voxeloo::shards;  // NOLINT

  VolumeBlock<Material> block;
  for (size_t x = 0; x < kBlockDim; x += 1) {
    for (size_t z = 0; z < kBlockDim; z += 1) {
      auto h = std::rand() % 4 + kBlockDim / 2;
      for (size_t y = 0; y < h; y += 1) {
        block.set(x, y, z, 1);
      }
    }
  }

  std::string blob = transport::to_blob(block);
  BENCHMARK("deserialize") {
    transport::from_blob<VolumeBlock<Material>>(blob);
  };
};

}  // namespace voxeloo
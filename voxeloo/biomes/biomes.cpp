#include "voxeloo/biomes/biomes.hpp"

#include <array>
#include <bitset>
#include <memory>

#include "voxeloo/biomes/shards.hpp"
#include "voxeloo/common/disjoint_set.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::biomes {

inline constexpr auto face_code(int face) {
  return (face + 1) << 16;
}

const int kFACE_FACE_BIT_LUT[6][6] = {
    {1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5},
    {1 << 1, 1 << 0, 1 << 6, 1 << 7, 1 << 8, 1 << 9},
    {1 << 2, 1 << 6, 1 << 0, 1 << 10, 1 << 11, 1 << 12},
    {1 << 3, 1 << 7, 1 << 10, 1 << 0, 1 << 13, 1 << 14},
    {1 << 4, 1 << 8, 1 << 11, 1 << 13, 1 << 0, 1 << 15},
    {1 << 5, 1 << 9, 1 << 12, 1 << 14, 1 << 15, 1 << 0},
};

uint32_t traverse_mask(const tensors::Tensor<uint32_t>& terrain) {
  auto permits_light = [](auto id) {
    return !galois::terrain::is_block_id(id);
  };

  if (tensors::all(terrain, permits_light)) {
    return 0xFFFF;
  }

  // Store the connected open space voxels, and also connect the boundary
  // voxels to the cube face ID they are associated with (0-5).
  // To distinguish the faces from block codes, we use `-1 - code`.
  DisjointSet<uint32_t> connected;

  // We only support single-chunk tensors, this is so that we can use the
  // encoded tensor position as a key in the disjoint set.
  CHECK_ARGUMENT(terrain.chunks.size() == 1);
  tensors::find(terrain, permits_light, [&](auto pos, auto val) {
    auto code = tensors::encode_tensor_pos(pos);
    auto [x, y, z] = pos;
    // Connect to the cube face markers.
    if (x == 0) {
      connected.merge(code, face_code(voxels::Dir::X_NEG));
    }
    if (x == tensors::kChunkDim - 1) {
      connected.merge(code, face_code(voxels::Dir::X_POS));
    }
    if (y == 0) {
      connected.merge(code, face_code(voxels::Dir::Y_NEG));
    }
    if (y == tensors::kChunkDim - 1) {
      connected.merge(code, face_code(voxels::Dir::Y_POS));
    }
    if (z == 0) {
      connected.merge(code, face_code(voxels::Dir::Z_NEG));
    }
    if (z == tensors::kChunkDim - 1) {
      connected.merge(code, face_code(voxels::Dir::Z_POS));
    }
    // Connect to adjacent open space, only in the positive direction
    // as we are traversing the cube in that direction.
    if (x < tensors::kChunkDim - 1 && permits_light(terrain.get(x + 1, y, z))) {
      connected.merge(code, code + 1);
    }
    if (y < tensors::kChunkDim - 1 && permits_light(terrain.get(x, y + 1, z))) {
      connected.merge(code, code + tensors::kChunkDim);
    }
    if (z < tensors::kChunkDim - 1 && permits_light(terrain.get(x, y, z + 1))) {
      connected.merge(code, code + tensors::kChunkDim * tensors::kChunkDim);
    }
  });

  uint32_t mask = 0;
  for (int a_face = 0; a_face < 6; ++a_face) {
    auto a_found = connected.find(face_code(a_face));
    for (int b_face = a_face + 1; b_face < 6; ++b_face) {
      if (a_found == connected.find(face_code(b_face))) {
        mask |= kFACE_FACE_BIT_LUT[a_face][b_face];
      }
    }
  }
  return mask;
}

OcclusionMask::OcclusionMask(
    std::unique_ptr<std::bitset<shards::kMaxBlockSize>> mask) {
  std::array<int, 6> num_occluding_voxels_per_face = {0};
  int num_occluding_voxels = 0;

  if (mask) {
    for (uint32_t i = 0; i < mask->size(); ++i) {
      if (mask->test(i)) {
        num_occluding_voxels += 1;

        const Vec3<uint32_t> pos = shards::block_decode(i);
        constexpr auto is_neg = [](int n) {
          return static_cast<int>(n == 0);
        };
        constexpr auto is_pos = [](int n) {
          return static_cast<int>(n == shards::kBlockDim - 1);
        };
        num_occluding_voxels_per_face[voxels::X_NEG] += is_neg(pos.x);
        num_occluding_voxels_per_face[voxels::X_POS] += is_pos(pos.x);
        num_occluding_voxels_per_face[voxels::Y_NEG] += is_neg(pos.y);
        num_occluding_voxels_per_face[voxels::Y_POS] += is_pos(pos.y);
        num_occluding_voxels_per_face[voxels::Z_NEG] += is_neg(pos.z);
        num_occluding_voxels_per_face[voxels::Z_POS] += is_pos(pos.z);
      }
    }
  }

  constexpr auto occluded_count_to_occlusion_summary = [](int max_count,
                                                          int num) {
    if (num == 0) {
      return EMPTY;
    } else if (num == max_count) {
      return FULL;
    } else {
      return MIXED;
    }
  };

  constexpr uint32_t voxels_per_face = shards::kBlockDim * shards::kBlockDim;
  for (int i = 0; i < 6; ++i) {
    face_occlusion_summary_[i] = occluded_count_to_occlusion_summary(
        voxels_per_face, num_occluding_voxels_per_face[i]);
  }
  volume_occlusion_summary_ = occluded_count_to_occlusion_summary(
      shards::kMaxBlockSize, num_occluding_voxels);

  if (volume_occlusion_summary_ == MIXED) {
    CHECK_STATE(mask);
    mask_ = std::move(mask);
  }
}

}  // namespace voxeloo::biomes

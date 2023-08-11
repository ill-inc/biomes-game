#include "voxeloo/gaia/water.hpp"

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/gaia/terrain.hpp"
#include "voxeloo/galois/conv.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::gaia {

namespace {

static constexpr uint8_t kMaxWater = 15;

auto is_flowable(TerrainId id) {
  return id == 0 || !galois::terrain::is_collidable(id);
}

auto build_water_mask(const WorldMap<uint8_t>& water, Vec3i chunk_pos) {
  return galois::conv::to_block(*water.chunk(chunk_pos), [&](Vec3i offset) {
    auto pos = chunk_pos + offset;
    return water.contains(pos) ? water.get(pos) : static_cast<uint8_t>(0);
  });
}

auto to_flowable_terrain(const TerrainMapV2& map, Vec3i pos) {
  return tensors::merge(
      map.seeds.chunk(pos)->array,
      map.diffs.chunk(pos)->array,
      [](auto t1, auto t2) {
        return is_flowable(t2.value_or(t1));
      });
}

}  // namespace

WorldMap<uint8_t> update_water(const TerrainMapV2& map, Vec3i chunk_pos) {
  // Load a 3D array with all shard positions and their neighbors.
  auto water_mask = build_water_mask(map.waters, chunk_pos);

  // Map the terrain to a bit-mask of
  auto flow_shard = to_flowable_terrain(map, chunk_pos);

  // Helper routine to check if a given water voxel is "falling" down.
  auto is_falling = [&](Vec3i pos) {
    auto below_pos = pos - vec3(0, 1, 0);
    auto world_pos = chunk_pos + below_pos;
    if (map.contains(world_pos)) {
      if (is_flowable(map.get_terrain(world_pos))) {
        if (water_mask.get(below_pos) != kMaxWater) {
          return true;
        }
      }
    }
    return false;
  };

  // Map positions that permit water to pass through them..
  auto out = tensors::map_sparse(flow_shard, [&](auto i, auto _) {
    auto pos = to<int>(tensors::decode_tensor_pos(i));
    auto val = water_mask.get(pos);
    if (val >= kMaxWater) {
      return kMaxWater;
    }

    // Determine the output by looking at the neighbor positions.
    auto x_neg = water_mask.get(pos - vec3(1, 0, 0));
    auto x_pos = water_mask.get(pos + vec3(1, 0, 0));
    auto y_pos = water_mask.get(pos + vec3(0, 1, 0));
    auto z_neg = water_mask.get(pos - vec3(0, 0, 1));
    auto z_pos = water_mask.get(pos + vec3(0, 0, 1));

    if (!val && !x_neg && !x_pos && !y_pos && !z_neg && !z_pos) {
      return static_cast<uint8_t>(0);
    }

    // Adjust the neighbor values based on falling conditions.
    if (x_neg > 0 && is_falling(pos - vec3(1, 0, 0))) {
      x_neg = 0;
    }
    if (x_pos > 0 && is_falling(pos + vec3(1, 0, 0))) {
      x_pos = 0;
    }
    if (z_neg > 0 && is_falling(pos - vec3(0, 0, 1))) {
      z_neg = 0;
    }
    if (z_pos > 0 && is_falling(pos + vec3(0, 0, 1))) {
      z_pos = 0;
    }

    // Determine the new value based on the maximum of the neighbors.
    auto d_max = std::max<uint8_t>({x_neg, x_pos, z_neg, z_pos});
    if (y_pos >= d_max) {
      return std::min(static_cast<uint8_t>(kMaxWater - 1), y_pos);
    } else {
      return static_cast<uint8_t>(d_max - 1);
    }
  });

  // Write out the updated chunk
  return WorldMap<uint8_t>{
      voxels::shift_box(kShardBox, chunk_pos),
      make_tensor(tensors::Chunk(out))};
}

}  // namespace voxeloo::gaia
#pragma once

#include <memory>
#include <optional>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/gaia/deps.hpp"
#include "voxeloo/gaia/lazy.hpp"
#include "voxeloo/gaia/logger.hpp"
#include "voxeloo/gaia/maps.hpp"
#include "voxeloo/gaia/stream.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/buffers.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

using galois::terrain::TerrainId;

static const auto kShardShape = tensors::kChunkShape;

using VolumeChunk = tensors::Tensor<TerrainId>;
using SparseChunk = tensors::Tensor<std::optional<TerrainId>>;
using DyeChunk = tensors::Tensor<uint8_t>;
using GrowthChunk = tensors::Tensor<uint8_t>;
using WaterChunk = tensors::Tensor<uint8_t>;
using IrradianceChunk = tensors::Tensor<uint32_t>;
using OcclusionChunk = tensors::Tensor<uint8_t>;

struct TerrainMap {
  WorldMap<TerrainId> seeds;
  WorldMap<std::optional<TerrainId>> diffs;
  WorldMap<uint8_t> dyes;

  TerrainMap(
      const voxels::Box& aabb,
      tensors::Tensor<TerrainId> seeds,
      tensors::Tensor<std::optional<TerrainId>> diffs,
      tensors::Tensor<uint8_t> dyes)
      : seeds{aabb, std::move(seeds)},
        diffs{aabb, std::move(diffs)},
        dyes{aabb, std::move(dyes)} {}

  auto aabb() const {
    return seeds.aabb;
  }

  auto contains(Vec3i pos) const {
    return seeds.contains(pos);
  }

  auto get_seed(Vec3i pos) const {
    return seeds.get(pos);
  }

  auto get_diff(Vec3i pos) const {
    return diffs.get(pos);
  }

  auto get_dye(Vec3i pos) const {
    return dyes.get(pos);
  }

  auto get(Vec3i pos) const {
    if (auto val = get_diff(pos); val) {
      return val.value();
    } else {
      return get_seed(pos);
    }
  }

  template <typename Fn>
  auto find_seed(TerrainId id, Fn&& fn) const {
    tensors::scan_chunks(
        seeds.tensor, [&](auto _, auto pos, const auto& chunk) {
          scan(chunk.array, [&](auto run, auto val) {
            if (val == id) {
              for (auto i = run.pos; i < run.pos + run.len; i += 1) {
                fn(seeds.tensor_to_world(pos + tensors::decode_tensor_pos(i)));
              }
            }
          });
        });
  }

  template <typename Fn>
  auto find_diff(TerrainId id, Fn&& fn) const {
    tensors::scan_chunks(
        diffs.tensor, [&](auto _, auto pos, const auto& chunk) {
          scan(chunk.array, [&](auto run, auto val) {
            if (val == id) {
              for (auto i = run.pos; i < run.pos + run.len; i += 1) {
                fn(diffs.tensor_to_world(pos + tensors::decode_tensor_pos(i)));
              }
            }
          });
        });
  }

  template <typename Fn>
  auto find(TerrainId id, Fn&& fn) const {
    find_seed(id, [&](auto pos) {
      if (!get_diff(pos)) {
        fn(pos);
      }
    });
    find_diff(id, fn);
  }

  auto& seed_chunk(Vec3i pos) {
    CHECK_ARGUMENT(contains(pos));
    return seeds.chunk(pos);
  }
  const auto& seed_chunk(Vec3i pos) const {
    CHECK_ARGUMENT(contains(pos));
    return seeds.chunk(pos);
  }

  auto& diff_chunk(Vec3i pos) {
    CHECK_ARGUMENT(contains(pos));
    return diffs.chunk(pos);
  }
  const auto& diff_chunk(Vec3i pos) const {
    CHECK_ARGUMENT(contains(pos));
    return diffs.chunk(pos);
  }

  auto& dye_chunk(Vec3i pos) {
    CHECK_ARGUMENT(contains(pos));
    return dyes.chunk(pos);
  }
  const auto& dye_chunk(Vec3i pos) const {
    CHECK_ARGUMENT(contains(pos));
    return dyes.chunk(pos);
  }

  auto storage_size() const {
    return seeds.storage_size() + diffs.storage_size() + dyes.storage_size();
  }
};

class TerrainMapBuilder {
 public:
  TerrainMapBuilder() : aabb_(voxels::empty_box()) {}

  auto aabb() const {
    return aabb_;
  }

  size_t storage_size() const;
  void assign_seed_block(Vec3i pos, VolumeChunk seed);
  void assign_diff_block(Vec3i pos, SparseChunk diff);
  void assign_dye_block(Vec3i pos, DyeChunk dye);
  TerrainMap build() &&;

 private:
  voxels::Box aabb_;
  spatial::Map<VolumeChunk> seeds_;
  spatial::Map<SparseChunk> diffs_;
  spatial::Map<DyeChunk> dyes_;
};

using TerrainStream = Stream<Vec3i>;

class TerrainWriter {
 public:
  explicit TerrainWriter(
      Dep<Logger> logger, Dep<Lazy<TerrainMap>> map, Dep<TerrainStream> stream)
      : logger_(std::move(logger)),
        map_(std::move(map)),
        stream_(std::move(stream)) {}

  bool update_diff(Vec3i pos, SparseChunk diff) {
    CHECK_ARGUMENT(diff.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && map_->get().contains(pos));

    return apply_changes(pos, map_->get().diff_chunk(pos), diff.chunks[0]);
  }

  bool update_dye(Vec3i pos, DyeChunk dye) {
    CHECK_ARGUMENT(dye.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && map_->get().contains(pos));

    return apply_changes(pos, map_->get().dye_chunk(pos), dye.chunks[0]);
  }

 private:
  bool apply_changes(
      Vec3i pos, const auto& src_tensor, const auto& tgt_tensor) {
    // Publish the positions at which terrain changes.
    bool changed = false;
    tensors::diff(
        src_tensor->array, tgt_tensor->array, [&](auto run, auto v1, auto v2) {
          changed = true;
          for (auto i = run.pos; i < run.pos + run.len; i += 1) {
            stream_->write(pos + to<int>(tensors::decode_tensor_pos(i)));
          }
        });

    // Update the map chunk.
    src_tensor->array = std::move(tgt_tensor->array);
    return changed;
  }

  Dep<Logger> logger_;
  Dep<Lazy<TerrainMap>> map_;
  Dep<TerrainStream> stream_;
};

// V2

struct TerrainMapV2 {
  WorldMap<TerrainId> seeds;
  WorldMap<std::optional<TerrainId>> diffs;
  WorldMap<TerrainId> terrains;
  WorldMap<uint8_t> waters;
  WorldMap<uint32_t> irradiances;
  WorldMap<uint8_t> dyes;
  WorldMap<uint8_t> growths;
  WorldMap<uint8_t> occlusions;

  auto aabb() const {
    return seeds.aabb;
  }

  bool contains(Vec3i pos) const {
    return seeds.contains(pos);
  }

  auto storage_size() const {
    return seeds.storage_size() + diffs.storage_size() +
           terrains.storage_size() + waters.storage_size() +
           irradiances.storage_size() + dyes.storage_size() +
           growths.storage_size() + occlusions.storage_size();
  }

  void update_diff(Vec3i pos, SparseChunk diff) {
    CHECK_ARGUMENT(diff.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    diffs.chunk(pos) = diff.chunks[0];
    update_terrain(pos);
  }

  void update_water(Vec3i pos, WaterChunk water) {
    CHECK_ARGUMENT(water.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    waters.chunk(pos) = water.chunks[0];
  }

  void update_irradiance(Vec3i pos, IrradianceChunk irradiance) {
    CHECK_ARGUMENT(irradiance.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    irradiances.chunk(pos) = irradiance.chunks[0];
  }

  void update_dye(Vec3i pos, DyeChunk dye) {
    CHECK_ARGUMENT(dye.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    dyes.chunk(pos) = dye.chunks[0];
  }

  void update_growth(Vec3i pos, GrowthChunk growth) {
    CHECK_ARGUMENT(growth.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    growths.chunk(pos) = growth.chunks[0];
  }

  void update_occlusion(Vec3i pos, OcclusionChunk occlusion) {
    CHECK_ARGUMENT(occlusion.shape == kShardShape);
    CHECK_ARGUMENT(is_shard_aligned(pos) && contains(pos));

    occlusions.chunk(pos) = occlusion.chunks[0];
  }

  auto get_terrain(Vec3i pos) const {
    return terrains.get(pos);
  }

 private:
  void update_terrain(Vec3i pos) {
    // Update terrain
    terrains.chunk(pos) = tensors::merge(
                              make_tensor(*seeds.chunk(pos)),
                              make_tensor(*diffs.chunk(pos)),
                              [](auto seed, auto diff) {
                                return diff.value_or(seed);
                              })
                              .chunks[0];
  }
};

class TerrainMapBuilderV2 {
 public:
  void assign_seed_block(Vec3i pos, const VolumeChunk& seed);
  void assign_diff_block(Vec3i pos, const SparseChunk& diff);
  void assign_water_block(Vec3i pos, const WaterChunk& dye);
  void assign_irradiance_block(Vec3i pos, const IrradianceChunk& irradiance);
  void assign_dye_block(Vec3i pos, const DyeChunk& dye);
  void assign_growth_block(Vec3i pos, const GrowthChunk& dye);
  void assign_occlusion_block(Vec3i pos, const OcclusionChunk& occlusion);
  Vec3i aabb();
  uint32_t shard_count();
  uint32_t hole_count();
  TerrainMapV2 build() &&;

 private:
  Set3 seeded_;
  WorldMapBuilder<TerrainId> seeds_;
  WorldMapBuilder<std::optional<TerrainId>> diffs_;
  WorldMapBuilder<uint8_t> waters_;
  WorldMapBuilder<uint32_t> irradiances_;
  WorldMapBuilder<uint8_t> dyes_;
  WorldMapBuilder<uint8_t> growths_;
  WorldMapBuilder<uint8_t> occlusions_;
};

}  // namespace voxeloo::gaia

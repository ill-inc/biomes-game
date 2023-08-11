#include "voxeloo/gaia/terrain.hpp"

#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

size_t TerrainMapBuilder::storage_size() const {
  auto ret = sizeof(aabb_);
  ret += spatial::storage_size<VolumeChunk>(seeds_);
  ret += spatial::storage_size<SparseChunk>(diffs_);
  ret += spatial::storage_size<DyeChunk>(dyes_);
  for (const auto& [pos, chunk] : seeds_) {
    ret += tensors::storage_size(chunk);
  }
  for (const auto& [pos, chunk] : diffs_) {
    ret += tensors::storage_size(chunk);
  }
  for (const auto& [pos, chunk] : dyes_) {
    ret += tensors::storage_size(chunk);
  }
  return ret;
}

void TerrainMapBuilder::assign_seed_block(Vec3i pos, VolumeChunk seed) {
  CHECK_ARGUMENT(is_shard_aligned(pos));
  CHECK_ARGUMENT(seed.shape == kShardShape);
  seeds_[pos] = std::move(seed);
  aabb_ = voxels::union_box(aabb_, voxels::shift_box(kShardBox, pos));
}

void TerrainMapBuilder::assign_diff_block(Vec3i pos, SparseChunk diff) {
  CHECK_ARGUMENT(is_shard_aligned(pos));
  CHECK_ARGUMENT(diff.shape == kShardShape);
  diffs_[pos] = std::move(diff);
  aabb_ = voxels::union_box(aabb_, voxels::shift_box(kShardBox, pos));
}

void TerrainMapBuilder::assign_dye_block(Vec3i pos, DyeChunk dye) {
  CHECK_ARGUMENT(is_shard_aligned(pos));
  CHECK_ARGUMENT(dye.shape == kShardShape);
  dyes_[pos] = std::move(dye);
  aabb_ = voxels::union_box(aabb_, voxels::shift_box(kShardBox, pos));
}

TerrainMap TerrainMapBuilder::build() && {
  CHECK_ARGUMENT(aabb_ != voxels::empty_box());
  auto shape = voxels::box_size(aabb_).template to<unsigned int>();

  // Create the final seed tensor.
  auto seeds = tensors::make_tensor<TerrainId>(shape);
  for (auto& [pos, seed] : seeds_) {
    auto ijk = to<unsigned int>(pos - aabb_.v0);
    seeds.chunk(ijk)->array = std::move(seed.chunks[0]->array);
  }

  // Create the final diff tensor
  auto diffs = tensors::make_tensor<std::optional<TerrainId>>(shape);
  for (auto& [pos, diff] : diffs_) {
    auto ijk = to<unsigned int>(pos - aabb_.v0);
    diffs.chunk(ijk)->array = std::move(diff.chunks[0]->array);
  }

  // Create the final dye tensor
  auto dyes = tensors::make_tensor<uint8_t>(shape);
  for (auto& [pos, dye] : dyes_) {
    auto ijk = to<unsigned int>(pos - aabb_.v0);
    dyes.chunk(ijk)->array = std::move(dye.chunks[0]->array);
  }

  return TerrainMap{
      std::move(aabb_), std::move(seeds), std::move(diffs), std::move(dyes)};
}

// V2

void TerrainMapBuilderV2::assign_seed_block(
    Vec3i pos, const VolumeChunk& seed) {
  seeds_.assign_block(pos, seed);
  seeded_.insert(pos);
}

void TerrainMapBuilderV2::assign_diff_block(
    Vec3i pos, const SparseChunk& diff) {
  diffs_.assign_block(pos, diff);
}

void TerrainMapBuilderV2::assign_water_block(
    Vec3i pos, const WaterChunk& water) {
  waters_.assign_block(pos, water);
}

void TerrainMapBuilderV2::assign_irradiance_block(
    Vec3i pos, const IrradianceChunk& irradiance) {
  irradiances_.assign_block(pos, irradiance);
}

void TerrainMapBuilderV2::assign_dye_block(Vec3i pos, const DyeChunk& dye) {
  dyes_.assign_block(pos, dye);
}

void TerrainMapBuilderV2::assign_growth_block(
    Vec3i pos, const GrowthChunk& growth) {
  growths_.assign_block(pos, growth);
}

void TerrainMapBuilderV2::assign_occlusion_block(
    Vec3i pos, const OcclusionChunk& occlusion) {
  occlusions_.assign_block(pos, occlusion);
}

Vec3i TerrainMapBuilderV2::aabb() {
  return voxels::box_size(seeds_.aabb());
}

uint32_t TerrainMapBuilderV2::shard_count() {
  auto [w, h, d] = to<uint64_t>(aabb());
  return static_cast<uint32_t>((w * h * d) / tensors::kChunkSize);
}

uint32_t TerrainMapBuilderV2::hole_count() {
  auto shards = shard_count();
  if (shards > seeded_.size()) {
    return shards - seeded_.size();
  } else {
    return 0;
  }
}

TerrainMapV2 TerrainMapBuilderV2::build() && {
  auto aabb = voxels::union_box({
      seeds_.aabb(),
      diffs_.aabb(),
      waters_.aabb(),
      irradiances_.aabb(),
      dyes_.aabb(),
      growths_.aabb(),
      occlusions_.aabb(),
  });

  auto seeds = std::move(seeds_).build(aabb);
  auto diffs = std::move(diffs_).build(aabb);
  auto terrains = WorldMap<TerrainId>{
      seeds.aabb,
      tensors::merge(seeds.tensor, diffs.tensor, [](auto seed, auto diff) {
        return diff.value_or(seed);
      })};
  return TerrainMapV2{
      std::move(seeds),
      std::move(diffs),
      std::move(terrains),
      std::move(waters_).build(aabb),
      std::move(irradiances_).build(aabb),
      std::move(dyes_).build(aabb),
      std::move(growths_).build(aabb),
      std::move(occlusions_).build(aabb),
  };
}

}  // namespace voxeloo::gaia

#pragma once

#include "voxeloo/biomes/biomes.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/tensors.hpp"

// This file contains routines to enable migrating off the biomes VolumeBlock
// and SparseBlock data structures in favor of using the tensors library.

namespace voxeloo::biomes::migration {

using galois::terrain::TerrainId;

template <typename T>
using Run = std::tuple<tensors::ArrayPos, tensors::ArrayPos, T>;

template <typename T>
inline auto tensor_from_runs(std::vector<Run<T>> runs) {
  tensors::ArrayBuilder<T> builder(1 + 2 * runs.size());
  for (auto [pos, len, id] : runs) {
    if (builder.back() < pos) {
      builder.add(pos - builder.back(), T());
    }
    builder.add(len, id);
  }
  if (builder.back() < tensors::kChunkSize) {
    builder.add(tensors::kChunkSize - builder.back(), T());
  }
  return tensors::make_tensor(tensors::Chunk<T>(std::move(builder).build()));
}

template <typename T>
inline auto tensor_from_volume_block(
    const voxeloo::biomes::VolumeBlock<T>& block) {
  // Extract all of the runs and sort them in the tensor order.
  std::vector<Run<T>> runs;
  block.scan_runs([&](const auto& span, const auto& id) {
    spatial::decompose_span<shards::kBlockDim>(span, [&](auto pos, auto len) {
      runs.push_back({
          tensors::encode_tensor_pos(to<unsigned int>(pos)),
          static_cast<tensors::ArrayPos>(len),
          id,
      });
    });
  });
  std::sort(runs.begin(), runs.end(), [](const auto& l, const auto& r) {
    return std::get<0>(l) < std::get<0>(r);
  });

  return tensor_from_runs(std::move(runs));
}

template <typename T>
inline auto tensor_from_sparse_block(
    const voxeloo::biomes::SparseBlock<T>& block) {
  // Extract all of the sets and sort them in the tensor order.
  std::vector<Run<std::optional<TerrainId>>> runs;
  runs.reserve(block.size());
  block.scan([&](auto x, auto y, auto z, auto id) {
    runs.push_back({tensors::encode_tensor_pos({x, y, z}), 1, id});
  });
  std::sort(runs.begin(), runs.end(), [](const auto& l, const auto& r) {
    return std::get<0>(l) < std::get<0>(r);
  });

  // Add the tensor to the gaia map.
  return tensor_from_runs(std::move(runs));
}

}  // namespace voxeloo::biomes::migration

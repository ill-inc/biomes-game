#pragma once

#include <chrono>

#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

inline auto is_shard_aligned(Vec3i pos) {
  return pos % static_cast<int>(tensors::kChunkDim) == vec3(0, 0, 0);
}

template <typename T>
struct WorldMap {
  voxels::Box aabb;
  tensors::Tensor<T> tensor;

  Vec3u world_to_tensor(const Vec3i& pos) const {
    return to<unsigned int>(pos - aabb.v0);
  }

  Vec3i tensor_to_world(const Vec3u& pos) const {
    return to<int>(pos) + aabb.v0;
  }

  bool contains(Vec3i pos) const {
    return voxels::box_contains(aabb, pos);
  }

  auto get(const Vec3i& pos) const {
    return tensor.get(world_to_tensor(pos));
  }

  std::optional<T> maybe_get(const Vec3i& pos) const {
    if (contains(pos)) {
      return tensor.get(world_to_tensor(pos));
    }
    return {};
  }

  auto chunk_index(const Vec3i& pos) const {
    return tensor.chunk_index(world_to_tensor(pos));
  }

  auto& chunk(const Vec3i& pos) {
    return tensor.chunk(world_to_tensor(pos));
  }

  const auto& chunk(const Vec3i& pos) const {
    return tensor.chunk(world_to_tensor(pos));
  }

  auto storage_size() const {
    auto ret = sizeof(aabb);
    ret += tensors::storage_size(tensor);
    return ret;
  }
};

struct Vec2Hash {
  size_t operator()(Vec2i point) const {
    return point.x + 7909 * point.y;
  }
};

struct Vec3Hash {
  size_t operator()(Vec3i point) const {
    return point.x + 7909 * (point.y + 7909 * point.z);
  }
};

template <typename T>
using Map2 = std::unordered_map<Vec2i, T, Vec2Hash>;

template <typename T>
using Map3 = std::unordered_map<Vec3i, T, Vec3Hash>;

using Set2 = std::unordered_set<Vec2i, Vec2Hash>;
using Set3 = std::unordered_set<Vec3i, Vec3Hash>;

template <typename T>
class SparseMapWriter {
 public:
  explicit SparseMapWriter(WorldMap<T>& map) : map_(map) {}

  auto get(const Vec3i& pos) const {
    if (auto it = buffer_.find(pos); it != buffer_.end()) {
      return it->second;
    } else {
      return map_.get(pos);
    }
  }

  auto set(const Vec3i& pos, T val) {
    buffer_[pos] = val;
  }

  void flush() {
    using ChunkBuilder = tensors::SparseChunkBuilder<std::optional<T>>;

    // Chunkify the updates.
    std::unordered_map<size_t, ChunkBuilder> builders;
    for (const auto& [pos, val] : buffer_) {
      auto& builder = builders[map_.chunk_index(pos)];
      builder.set(tensors::chunk_mod(map_.world_to_tensor(pos)), val);
    }

    // Update all affected world map chunks by merging in the new values.
    for (auto&& [i, builder] : std::move(builders)) {
      auto src = std::move(builder).build();
      auto dst = map_.tensor.chunks[i];
      dst->array = tensors::merge(dst->array, src.array, [](auto a, auto b) {
        return b.value_or(a);
      });
    }
    buffer_.clear();
  }

 private:
  WorldMap<T>& map_;
  Map3<T> buffer_;
};

template <typename T>
class ShardWriter {
 public:
  explicit ShardWriter(WorldMap<T>& map) : writer_(map) {}

  auto get(const Vec3i& pos) const {
    return writer_.get(pos);
  }

  auto set(const Vec3i& pos, T val) {
    static const auto k = static_cast<int>(tensors::kChunkDim);
    changes_.insert(k * floor_div(pos, k));
    writer_.set(pos, val);
  }

  auto flush() {
    Set3 ret;
    ret.swap(changes_);
    writer_.flush();
    return ret;
  }

 private:
  SparseMapWriter<T> writer_;
  Set3 changes_;
};

template <typename T>
class ChecksumMap {
 public:
  ChecksumMap() = default;

  bool update(Vec3i pos, const tensors::Chunk<T>& chunk) {
    auto hash = tensors::hash(chunk.array);
    auto it = checksums_.find(pos);
    auto updated = it == checksums_.end() || it->second != hash;
    checksums_[pos] = hash;
    return updated;
  }

 private:
  Map3<uint32_t> checksums_;
};

class TimerMap {
  using Clock = std::chrono::high_resolution_clock;
  using Duration = std::chrono::duration<double, std::milli>;

 public:
  void clear(Vec3i pos) {
    times_.erase(pos);
  }

  void update(Vec3i pos) {
    times_[pos] = Clock::now();
  }

  bool ready(Vec3i pos, Duration duration) {
    if (auto it = times_.find(pos); it != times_.end()) {
      return Clock::now() - it->second > duration;
    }
    return true;
  }

  bool ready(Vec3i pos, double duration_ms) {
    return ready(pos, Duration(duration_ms));
  }

 private:
  Map3<std::chrono::time_point<Clock>> times_;
};

static const auto kShardBox = voxels::cube_box(tensors::kChunkDim);

template <typename T>
class WorldMapBuilder {
 public:
  WorldMapBuilder() : aabb_{voxels::empty_box()} {}

  void assign_block(Vec3i pos, tensors::Tensor<T> block) {
    CHECK_ARGUMENT(is_shard_aligned(pos));
    CHECK_ARGUMENT(block.shape == tensors::kChunkShape);
    map_[pos] = std::move(block);
    aabb_ = voxels::union_box(aabb_, voxels::shift_box(kShardBox, pos));
  }

  WorldMap<T> build(std::optional<voxels::Box> aabb_override) && {
    auto aabb = aabb_override.value_or(aabb_);
    auto shape = to<unsigned int>(voxels::box_size(aabb));
    auto out = tensors::make_tensor<T>(shape);
    for (auto& [pos, block] : map_) {
      auto ijk = to<uint32_t>(pos - aabb.v0);
      out.chunk(ijk)->array = std::move(block.chunks[0]->array);
    }

    return WorldMap<T>{aabb, std::move(out)};
  }

  const auto& aabb() const {
    return aabb_;
  }

 private:
  spatial::Map<tensors::Tensor<T>> map_;
  voxels::Box aabb_;
};

template <typename T>
inline WorldMap<T> sub_world_map(
    const WorldMap<T>& map, const voxels::Box& aabb) {
  CHECK_ARGUMENT(is_shard_aligned(aabb.v0) && is_shard_aligned(aabb.v1));

  Vec3u shape = to<uint32_t>(aabb.v1 - aabb.v0);
  auto [w, h, d] = tensors::chunk_div(shape);
  tensors::BufferBuilder<tensors::ChunkPtr<T>> builder(w * h * d);
  for (auto z = 0u; z < d; z += 1) {
    for (auto y = 0u; y < h; y += 1) {
      for (auto x = 0u; x < w; x += 1) {
        Vec3i pos = aabb.v0 + to<int>(tensors::chunk_mul({x, y, z}));
        if (map.contains(pos)) {
          builder.add(map.chunk(pos));
        } else {
          builder.add(tensors::make_chunk_ptr<T>());
        }
      }
    }
  }
  return WorldMap<T>{
      aabb, tensors::Tensor<T>{shape, std::move(builder).build()}};
}

}  // namespace voxeloo::gaia
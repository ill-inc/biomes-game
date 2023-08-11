#pragma once

#include <bitset>
#include <cstdint>
#include <memory>
#include <optional>
#include <tuple>
#include <vector>

#include "cereal/types/string.hpp"
#include "cereal/types/vector.hpp"
#include "voxeloo/biomes/shards.hpp"
#include "voxeloo/common/boxifier.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/frustum.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/quadifier.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::biomes {

using Material = RGBA;

template <typename Val>
class SparseBlock {
 public:
  void set(uint32_t x, uint32_t y, uint32_t z, Val v) {
    map_[shards::block_encode(x, y, z)] = std::move(v);
  }

  auto has(uint32_t x, uint32_t y, uint32_t z) const {
    return map_.count(shards::block_encode(x, y, z)) > 0;
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    std::optional<Val> ret;
    if (auto iter = map_.find(shards::block_encode(x, y, z));
        iter != map_.end()) {
      ret = iter->second;
    }
    return ret;
  }

  void del(uint32_t x, uint32_t y, uint32_t z) {
    map_.erase(shards::block_encode(x, y, z));
  }

  void clear() {
    map_.clear();
  }

  auto size() const {
    return map_.size();
  }

  auto empty() const {
    return map_.empty();
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& [code, val] : map_) {
      auto pos = shards::block_decode(code);
      fn(pos.x, pos.y, pos.z, val);
    }
  }

  auto entries() const {
    std::vector<std::tuple<uint32_t, Val>> entries;
    entries.reserve(map_.size());
    for (const auto& [code, val] : map_) {
      entries.push_back({code, val});
    }
    return entries;
  }

 private:
  spatial::UnorderedMap<uint32_t, Val> map_;
};

template <typename Val>
class VolumeBlock {
 public:
  explicit VolumeBlock(runs::Index<Val> index) : index_(std::move(index)) {
    CHECK_ARGUMENT(index_.size() == shards::kMaxBlockSize);
  }
  VolumeBlock() : VolumeBlock(runs::make_index<Val>(shards::kMaxBlockSize)) {}

  void compact() const {
    if (buffer_.size()) {
      runs::IndexBuilder<Val> builder(index_);
      for (auto& [code, val] : buffer_) {
        builder.add(code, std::move(val));
      }
      buffer_.clear();
      index_ = std::move(builder).build();
    }
  }

  void set(uint32_t x, uint32_t y, uint32_t z, Val v) {
    buffer_.emplace_back(shards::block_encode(x, y, z), std::move(v));
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    compact();
    return index_.get(shards::block_encode(x, y, z));
  }

  void fill(Val fill) {
    buffer_.clear();
    index_ = runs::make_index(shards::kMaxBlockSize, fill);
  }

  void assign(const SparseBlock<Val>& edits) {
    edits.scan([&](uint32_t x, uint32_t y, uint32_t z, Val v) {
      set(x, y, z, std::move(v));
    });
    compact();
  }

  auto mask() const {
    runs::IndexBuilder<bool> builder(shards::kMaxBlockSize);
    scan_runs([&](runs::Span span, Val val) {
      builder.add(span, static_cast<bool>(val));
    });
    return VolumeBlock<bool>(std::move(builder).build());
  }

  template <typename Fn>
  void scan_runs(Fn&& fn) const {
    compact();
    index_.scan([&](const auto& span, const auto& value) {
      if (value) {
        fn(span, value);
      }
    });
  }

  template <typename Fn>
  void scan_boxes(Fn&& fn) const {
    boxifier::Boxifier boxifier;
    scan_runs([&](const auto& span, ATTR_UNUSED const auto& value) {
      spatial::decompose_span<shards::kBlockDim>(span, [&](auto pos, auto len) {
        boxifier.push(boxifier::Run{pos, static_cast<int>(len)});
      });
    });
    boxifier.emit(fn);
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    scan_runs([&](const auto& span, const auto& value) {
      for (auto code = span.lo; code < span.hi; code += 1) {
        auto [x, y, z] = shards::block_decode(code);
        fn(x, y, z, value);
      }
    });
  }

  const auto& impl() const {
    compact();
    return index_;
  }

 private:
  mutable runs::Index<Val> index_;
  mutable std::vector<std::tuple<uint32_t, Val>> buffer_;
};

template <typename Val>
struct SparseMap {
 public:
  void set(int x, int y, int z, Val v) {
    impl_[vec3(x, y, z)] = std::move(v);
  }

  auto has(int x, int y, int z) const {
    return impl_.count(vec3(x, y, z)) > 0;
  }

  auto get(int x, int y, int z) const {
    return impl_.at(vec3(x, y, z));
  }

  void del(int x, int y, int z) {
    impl_.erase(vec3(x, y, z));
  }

  void clear() {
    impl_.clear();
  }

  auto size() const {
    return impl_.size();
  }

  auto assign(int x, int y, int z, const SparseBlock<Val>& block) {
    block.scan([&](int lx, int ly, int lz, auto v) {
      set(x + lx, y + ly, z + lz, std::move(v));
    });
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& [pos, val] : impl_) {
      fn(pos.x, pos.y, pos.z, val);
    }
  }

  auto storage_size() const {
    return spatial::storage_size(impl_);
  }

 private:
  spatial::Map<Val> impl_;
};

template <typename Val>
struct VolumeMap {
  static constexpr auto kMaxBufferSize = 32 * 1024;

 public:
  void set(int x, int y, int z, Val v) {
    buffer_.emplace_back(vec3(x, y, z), std::move(v));
    if (buffer_.size() > kMaxBufferSize) {
      compact();
    }
  }

  auto get(int x, int y, int z) const {
    compact();
    return impl_.access().get(x, y, z);
  }

  auto has(int x, int y, int z) const {
    return get(x, y, z) != 0;
  }

  auto assign(int x, int y, int z, const VolumeBlock<Val>& block) {
    compact();
    impl_.update_block(x, y, z, block.impl());
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    compact();
    impl_.scan(std::forward<Fn>(fn));
  }

  template <typename Fn>
  void scan_runs(Fn&& fn) const {
    compact();
    impl_.scan_runs(std::forward<Fn>(fn));
  }

  void clear() {
    buffer_.clear();
    impl_.clear();
  }

  auto access() const {
    compact();
    return impl_.access();
  }

  void compact() const {
    if (buffer_.size()) {
      impl_.update(buffer_);
      buffer_.clear();
    }
  }

  auto storage_size() const {
    compact();
    return impl_.storage_size();
  }

 private:
  mutable spatial::RangeIndex<Val, shards::kBlockDim> impl_;
  mutable std::vector<std::tuple<Vec3i, Val>> buffer_;
};

template <
    typename Val,
    typename Hash = std::hash<Val>,
    typename Equal = std::equal_to<Val>>
class BlockIndex {
 public:
  auto value(uint16_t index) const {
    return reverse_.at(index);
  }

  auto increment(Val&& val) {
    auto& entry = forward_[val];
    if (!entry.count) {
      entry.index = next();
      reverse_[entry.index] = std::forward<Val>(val);
    }
    entry.count += 1;
    return entry.index;
  }

  void decrement(Val&& val) {
    if (auto it = forward_.find(val); it != forward_.end()) {
      it->second.count -= 1;
      if (!it->second.count) {
        reverse_.erase(it->second.index);
        forward_.erase(it);
      }
    }
  }

  void clear() {
    forward_.clear();
    reverse_.clear();
  }

 private:
  struct Entry {
    uint16_t index;
    uint16_t count;
  };

  auto next() const {
    uint16_t ret = 0;
    for (; reverse_.count(ret); ret += 1) {
    }
    return ret;
  }

  spatial::UnorderedMap<Val, Entry, Hash, Equal> forward_;
  spatial::UnorderedMap<uint16_t, Val> reverse_;
};

template <
    typename Val,
    typename Hash = std::hash<Val>,
    typename Equal = std::equal_to<Val>>
class SparseTable {
 public:
  void set(uint32_t x, uint32_t y, uint32_t z, Val&& val) {
    auto key = index_.increment(std::forward<Val>(val));
    map_[shards::block_encode(x, y, z)] = key;
  }

  auto has(uint32_t x, uint32_t y, uint32_t z) const {
    return map_.count(shards::block_encode(x, y, z)) > 0;
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    std::optional<Val> ret;
    if (auto iter = map_.find(shards::block_encode(x, y, z));
        iter != map_.end()) {
      ret = index_.value(iter->second);
    }
    return ret;
  }

  void del(uint32_t x, uint32_t y, uint32_t z) {
    auto offset = shards::block_encode(x, y, z);
    if (auto iter = map_.find(offset); iter != map_.end()) {
      index_.decrement(index_.value(iter->second));
      map_.erase(offset);
    }
  }

  void clear() {
    index_.clear();
    map_.clear();
  }

  auto size() const {
    return map_.size();
  }

  auto empty() const {
    return map_.empty();
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& [code, val] : map_) {
      auto pos = shards::block_decode(code);
      fn(pos.x, pos.y, pos.z, index_.value(val));
    }
  }

 private:
  BlockIndex<std::string, Hash, Equal> index_;
  spatial::UnorderedMap<uint32_t, uint16_t> map_;
};

enum BiomesFormat {
  SPARSE_BLOCK_FORMAT = 1,
  VOLUME_BLOCK_FORMAT_DEPRECATED = 2,
  SPARSE_MAP_FORMAT = 3,
  VOLUME_MAP_FORMAT = 4,
  SPARSE_TABLE_FORMAT = 5,
  VOLUME_BLOCK_FORMAT = 6,
};

template <typename Archive, typename Val>
inline void save(Archive& ar, const SparseBlock<Val>& block) {
  ar(BiomesFormat::SPARSE_BLOCK_FORMAT);
  ar(static_cast<uint32_t>(block.size()));

  // We emit all entries in sorted order to ensure 1:1 serde.
  auto entries = block.entries();
  std::sort(entries.begin(), entries.end(), [](auto& l, auto& r) {
    return std::get<0>(l) < std::get<0>(r);
  });
  for (const auto& [code, val] : entries) {
    ar(code, val);
  }
}

template <typename Archive, typename Val>
inline void load(Archive& ar, SparseBlock<Val>& block) {
  auto fmt = transport::get<BiomesFormat>(ar);
  CHECK_ARGUMENT(fmt == BiomesFormat::SPARSE_BLOCK_FORMAT);

  auto size = transport::get<uint32_t>(ar);
  block.clear();
  for (uint32_t i = 0; i < size; i += 1) {
    auto [x, y, z] = shards::block_decode(transport::get<uint32_t>(ar));
    block.set(x, y, z, transport::get<Val>(ar));
  }
}

template <typename Archive, typename Val>
inline void save(Archive& ar, const SparseTable<Val>& block) {
  ar(BiomesFormat::SPARSE_TABLE_FORMAT);
  ar(static_cast<uint32_t>(block.size()));
  block.scan([&](uint32_t x, uint32_t y, uint32_t z, const Val& val) {
    ar(shards::block_encode(x, y, z), val);
  });
}

template <typename Archive, typename Val>
inline void load(Archive& ar, SparseTable<Val>& block) {
  auto fmt = transport::get<BiomesFormat>(ar);
  CHECK_ARGUMENT(fmt == BiomesFormat::SPARSE_TABLE_FORMAT);

  auto size = transport::get<uint32_t>(ar);
  block.clear();
  for (uint32_t i = 0; i < size; i += 1) {
    auto [x, y, z] = shards::block_decode(transport::get<uint32_t>(ar));
    block.set(x, y, z, transport::get<Val>(ar));
  }
}

template <typename Archive, typename Val>
inline void save(Archive& ar, const VolumeBlock<Val>& block) {
  block.compact();
  ar(BiomesFormat::VOLUME_BLOCK_FORMAT);
  ar(block.impl());
}

template <typename Archive, typename Val>
inline void load(Archive& ar, VolumeBlock<Val>& block) {
  using runs::Pos;

  auto fmt = transport::get<BiomesFormat>(ar);
  CHECK_ARGUMENT(
      fmt == BiomesFormat::VOLUME_BLOCK_FORMAT ||
      fmt == BiomesFormat::VOLUME_BLOCK_FORMAT_DEPRECATED);

  // TODO(taylor): Remove old deserialization format here.
  if (fmt == BiomesFormat::VOLUME_BLOCK_FORMAT) {
    runs::Index<Val> index;
    ar(index);
    block = VolumeBlock<Val>(std::move(index));
    return;
  } else {
    auto size = transport::get<uint32_t>(ar);
    std::vector<Pos> ends;
    std::vector<Val> vals;
    ends.reserve(2 * size);
    vals.reserve(2 * size);
    Pos prev = 0;
    for (uint32_t i = 0; i < size; i += 1) {
      auto lo = transport::get<Pos>(ar);
      auto hi = transport::get<Pos>(ar);
      auto val = transport::get<Val>(ar);
      if (prev < lo) {
        ends.emplace_back(lo - 1);
        vals.emplace_back(Val(0));
      }
      ends.emplace_back(hi - 1);
      vals.emplace_back(val);
      prev = hi;
    }
    if (ends.empty() || ends.back() < shards::kMaxBlockSize - 1) {
      ends.emplace_back(shards::kMaxBlockSize - 1);
      vals.emplace_back(Val(0));
    }

    runs::Index<Val> index(runs::Index<Val>(std::move(ends), std::move(vals)));
    block = VolumeBlock<Val>(std::move(index));
  }
}

template <typename Archive, typename Val>
inline void save(Archive& ar, const SparseMap<Val>& map) {
  ar(BiomesFormat::SPARSE_MAP_FORMAT);
  ar(static_cast<uint32_t>(map.size()));
  map.scan([&](int x, int y, int z, const Val& val) {
    ar(x, y, z);
    ar(val);
  });
}

template <typename Archive, typename Val>
inline void load(Archive& ar, SparseMap<Val>& map) {
  auto fmt = transport::get<BiomesFormat>(ar);
  CHECK_ARGUMENT(fmt == BiomesFormat::SPARSE_MAP_FORMAT);

  auto size = transport::get<uint32_t>(ar);
  map.clear();
  for (uint32_t i = 0; i < size; i += 1) {
    auto x = transport::get<int>(ar);
    auto y = transport::get<int>(ar);
    auto z = transport::get<int>(ar);
    map.set(x, y, z, transport::get<Val>(ar));
  }
}

template <typename Archive, typename Val>
inline void save(Archive& ar, const VolumeMap<Val>& map) {
  ar(BiomesFormat::VOLUME_MAP_FORMAT);

  uint32_t size = 0;
  map.scan_runs(
      [&](ATTR_UNUSED auto pos, ATTR_UNUSED auto len, ATTR_UNUSED auto val) {
        size += 1;
      });
  ar(size);

  map.scan_runs([&](const auto& pos, auto len, const auto& val) {
    ar(pos.x, pos.y, pos.z, len);
    ar(val);
  });
}

template <typename Archive, typename Val>
inline void load(Archive& ar, VolumeMap<Val>& map) {
  auto fmt = transport::get<BiomesFormat>(ar);
  CHECK_ARGUMENT(fmt == BiomesFormat::VOLUME_MAP_FORMAT);

  auto size = transport::get<uint32_t>(ar);
  map.clear();
  for (uint32_t n = 0; n < size; n += 1) {
    auto x = transport::get<int>(ar);
    auto y = transport::get<int>(ar);
    auto z = transport::get<int>(ar);
    auto l = static_cast<int>(transport::get<uint32_t>(ar));
    auto v = transport::get<Val>(ar);
    for (int i = 0; i < l; i += 1) {
      map.set(x + i, y, z, v);
    }
  }
  map.compact();
}

struct BiomesVertex {
  Vec3f pos;
  Vec3f normal;
  Vec2f uv;
  uint32_t mat;
  uint32_t dir;
};

struct BiomesMesh {
  std::vector<BiomesVertex> vertices;
  std::vector<uint32_t> indices;
};

struct CompactVertex {
  uint32_t attr;
  uint32_t color_index;
  uint32_t light_index;
};

struct CompactMesh {
  Vec3i offset;
  std::vector<CompactVertex> vertices;
  std::vector<uint32_t> indices;
};

struct Group {
  Material mat;
  voxels::Dir dir;
};

struct GroupedVertex {
  Vec3f pos;
  Vec3f normal;
  Vec2f uv;
};

struct GroupedMesh {
  std::vector<GroupedVertex> vertices;
  std::vector<std::vector<uint32_t>> indices;
  std::vector<Group> groups;
};

inline bool operator==(const Group& a, const Group& b) {
  return a.mat == b.mat && a.dir == b.dir;
}

struct GroupHash {
  size_t operator()(const Group& group) const {
    auto x = static_cast<uint32_t>(group.mat);
    auto y = static_cast<uint32_t>(group.dir);
    return spatial::combine(x, y, 0);
  }
};

using VoxelQuads = typename voxels::VoxelQuadifier<Material>::Output;

template <typename TextureFn>
inline auto to_biomes_mesh(
    const VoxelQuads& quads, const Vec3i& offset, TextureFn&& texture_fn) {
  BiomesMesh mesh;
  int index_offset = 0;
  for (const auto& [p, q] : quads) {
    auto mat = p.key;
    auto dir = p.dir;
    auto emit_vertex = [&](int x, int y, int z) {
      auto pos = (vec3(x, y, z) + offset).to<float>();
      mesh.vertices.emplace_back(BiomesVertex{
          pos,
          voxels::face_normal(dir),
          voxels::face_uv_coords(pos, dir),
          static_cast<uint32_t>(texture_fn(mat, dir)),
          static_cast<uint32_t>(dir),
      });
    };

    if (p.dir == voxels::X_NEG) {
      emit_vertex(p.lvl, q.v0.y, q.v0.x);
      emit_vertex(p.lvl, q.v0.y, q.v1.x);
      emit_vertex(p.lvl, q.v1.y, q.v1.x);
      emit_vertex(p.lvl, q.v1.y, q.v0.x);
    }
    if (p.dir == voxels::X_POS) {
      emit_vertex(p.lvl, q.v0.y, q.v1.x);
      emit_vertex(p.lvl, q.v0.y, q.v0.x);
      emit_vertex(p.lvl, q.v1.y, q.v0.x);
      emit_vertex(p.lvl, q.v1.y, q.v1.x);
    }
    if (p.dir == voxels::Y_NEG) {
      emit_vertex(q.v0.x, p.lvl, q.v0.y);
      emit_vertex(q.v1.x, p.lvl, q.v0.y);
      emit_vertex(q.v1.x, p.lvl, q.v1.y);
      emit_vertex(q.v0.x, p.lvl, q.v1.y);
    }
    if (p.dir == voxels::Y_POS) {
      emit_vertex(q.v0.x, p.lvl, q.v0.y);
      emit_vertex(q.v0.x, p.lvl, q.v1.y);
      emit_vertex(q.v1.x, p.lvl, q.v1.y);
      emit_vertex(q.v1.x, p.lvl, q.v0.y);
    }
    if (p.dir == voxels::Z_NEG) {
      emit_vertex(q.v0.x, q.v0.y, p.lvl);
      emit_vertex(q.v0.x, q.v1.y, p.lvl);
      emit_vertex(q.v1.x, q.v1.y, p.lvl);
      emit_vertex(q.v1.x, q.v0.y, p.lvl);
    }
    if (p.dir == voxels::Z_POS) {
      emit_vertex(q.v0.x, q.v0.y, p.lvl);
      emit_vertex(q.v1.x, q.v0.y, p.lvl);
      emit_vertex(q.v1.x, q.v1.y, p.lvl);
      emit_vertex(q.v0.x, q.v1.y, p.lvl);
    }

    for (const auto i : voxels::face_indices()) {
      mesh.indices.emplace_back(index_offset + i);
    }

    index_offset += 4;
  }

  return mesh;
}

template <typename TextureFn>
inline auto to_biomes_mesh(
    const SparseBlock<Material>& block,
    const Vec3i& offset,
    TextureFn&& texture_fn) {
  // First pass builds an occlusion bit mask that should fit in L1.
  std::vector<bool> mask(shards::kMaxBlockSize);
  block.scan([&](auto x, auto y, auto z, ATTR_UNUSED Material m) {
    mask[shards::block_encode(x, y, z)] = true;
  });

  // Helper function to test if a voxel is empty.
  auto empty = [&](const Vec3i& pos) -> bool {
    static const auto box = voxels::cube_box(shards::kBlockDim);
    if (voxels::box_contains(box, pos)) {
      return !mask[shards::block_encode(pos.x, pos.y, pos.z)];
    }
    return true;
  };

  // Emit faces along each direction adjacent to an empty voxel.
  voxels::VoxelQuadifier<Material> quadifier;
  block.scan([&](auto bx, auto by, auto bz, Material m) {
    auto x = static_cast<int>(bx);
    auto y = static_cast<int>(by);
    auto z = static_cast<int>(bz);
    quadifier.push(x, y, z, m, empty);
  });

  return to_biomes_mesh<TextureFn>(
      quadifier.build(), offset, std::forward<TextureFn>(texture_fn));
}

template <typename TextureFn>
inline auto to_biomes_mesh(
    const VolumeBlock<Material>& block,
    const Vec3i& offset,
    TextureFn&& texture_fn) {
  // First pass builds an occlusion bit mask that should fit in L1.
  std::vector<bool> mask(shards::kMaxBlockSize);
  block.scan_runs([&](runs::Span span, ATTR_UNUSED Material m) {
    for (auto code = span.lo; code < span.hi; code += 1) {
      mask[code] = true;
    }
  });

  // Helper function to test if a voxel is empty.
  auto empty = [&](const Vec3i& pos) -> bool {
    static const auto box = voxels::cube_box(shards::kBlockDim);
    if (voxels::box_contains(box, pos)) {
      return !mask[shards::block_encode(pos.x, pos.y, pos.z)];
    }
    return true;
  };

  // Emit faces along each direction adjacent to an empty voxel.
  voxels::VoxelQuadifier<Material> quadifier;
  block.scan([&](auto bx, auto by, auto bz, Material m) {
    auto x = static_cast<int>(bx);
    auto y = static_cast<int>(by);
    auto z = static_cast<int>(bz);
    quadifier.push(x, y, z, m, empty);
  });

  return to_biomes_mesh<TextureFn>(
      quadifier.build(), offset, std::forward<TextureFn>(texture_fn));
}

template <typename TextureFn>
inline auto to_biomes_mesh(
    const SparseMap<Material>& map, TextureFn&& texture_fn) {
  auto empty = [&](const Vec3i& pos) {
    return !map.has(pos.x, pos.y, pos.z);
  };

  // Emit faces along each direction adjacent to an empty voxel.
  voxels::VoxelQuadifier<Material> quadifier;
  map.scan([&](int x, int y, int z, Material m) {
    quadifier.push(x, y, z, m, empty);
  });

  return to_biomes_mesh<TextureFn>(
      quadifier.build(), Vec3i{0, 0, 0}, std::forward<TextureFn>(texture_fn));
}

template <typename TextureFn>
inline auto to_biomes_mesh(
    const VolumeMap<Material>& map, TextureFn&& texture_fn) {
  auto acc = map.access();
  auto empty = [&](const Vec3i& pos) {
    return acc.get(pos.x, pos.y, pos.z) == 0;
  };

  // Emit faces along each direction adjacent to an empty voxel.
  voxels::VoxelQuadifier<Material> quadifier;
  map.scan([&](int x, int y, int z, Material m) {
    quadifier.push(x, y, z, m, empty);
  });

  return to_biomes_mesh<TextureFn>(
      quadifier.build(), Vec3i{0, 0, 0}, std::forward<TextureFn>(texture_fn));
}

inline auto to_grouped_mesh(const BiomesMesh& mesh) {
  GroupedMesh ret;

  // Copy over the vertices.
  for (const auto& [pos, normal, uv, mat, dir] : mesh.vertices) {
    ret.vertices.emplace_back(GroupedVertex{pos, normal, uv});
  }

  // Copy over the indices.
  std::unordered_map<Group, size_t, GroupHash> offsets;
  for (auto index : mesh.indices) {
    const auto& v = mesh.vertices.at(index);
    Group group{static_cast<Material>(v.mat), static_cast<voxels::Dir>(v.dir)};
    if (auto it = offsets.find(group); it != offsets.end()) {
      ret.indices.at(it->second).push_back(index);
    } else {
      offsets[group] = ret.indices.size();
      ret.indices.emplace_back(std::vector<uint32_t>{index});
      ret.groups.emplace_back(group);
    }
  }

  return ret;
}

inline auto to_grouped_mesh(const SparseMap<Material>& map) {
  return to_grouped_mesh(
      to_biomes_mesh(map, [](Material mat, ATTR_UNUSED voxels::Dir dir) {
        return static_cast<int>(mat);
      }));
}

inline auto to_grouped_mesh(const VolumeMap<Material>& map) {
  return to_grouped_mesh(
      to_biomes_mesh(map, [](Material mat, ATTR_UNUSED voxels::Dir dir) {
        return static_cast<int>(mat);
      }));
}

template <typename TextureFn>
inline auto to_compact_mesh(
    const VoxelQuads& quads, const Vec3i& offset, TextureFn&& texture_fn) {
  CompactMesh mesh;
  mesh.offset = offset;

  int faces_offset = 0;
  int index_offset = 0;
  for (const auto& [p, q] : quads) {
    auto mat = p.key;
    auto dir = p.dir;
    uint32_t face_w = q.v1.x - q.v0.x;
    uint32_t face_h = q.v1.y - q.v0.y;
    uint32_t color_index = texture_fn(mat, dir);
    uint32_t light_index = (faces_offset << 12) | (face_w << 6) | face_h;

    auto emit_vertex = [&](int x, int y, int z, int u, int v) {
      uint32_t attr = (x << 12) | (y << 6) | z;
      attr = (attr << 3) | static_cast<int>(dir);
      attr = (attr << 2) | (u << 1) | v;
      mesh.vertices.emplace_back(CompactVertex{attr, color_index, light_index});
    };

    switch (p.dir) {
      case voxels::X_NEG:
        emit_vertex(p.lvl, q.v0.y, q.v0.x, 0, 0);
        emit_vertex(p.lvl, q.v0.y, q.v1.x, 1, 0);
        emit_vertex(p.lvl, q.v1.y, q.v1.x, 1, 1);
        emit_vertex(p.lvl, q.v1.y, q.v0.x, 0, 1);
        break;
      case voxels::X_POS:
        emit_vertex(p.lvl, q.v0.y, q.v0.x, 0, 0);
        emit_vertex(p.lvl, q.v1.y, q.v0.x, 0, 1);
        emit_vertex(p.lvl, q.v1.y, q.v1.x, 1, 1);
        emit_vertex(p.lvl, q.v0.y, q.v1.x, 1, 0);
        break;
      case voxels::Y_NEG:
        emit_vertex(q.v0.x, p.lvl, q.v0.y, 0, 0);
        emit_vertex(q.v1.x, p.lvl, q.v0.y, 1, 0);
        emit_vertex(q.v1.x, p.lvl, q.v1.y, 1, 1);
        emit_vertex(q.v0.x, p.lvl, q.v1.y, 0, 1);
        break;
      case voxels::Y_POS:
        emit_vertex(q.v0.x, p.lvl, q.v0.y, 0, 0);
        emit_vertex(q.v0.x, p.lvl, q.v1.y, 0, 1);
        emit_vertex(q.v1.x, p.lvl, q.v1.y, 1, 1);
        emit_vertex(q.v1.x, p.lvl, q.v0.y, 1, 0);
        break;
      case voxels::Z_NEG:
        emit_vertex(q.v0.x, q.v0.y, p.lvl, 0, 0);
        emit_vertex(q.v0.x, q.v1.y, p.lvl, 0, 1);
        emit_vertex(q.v1.x, q.v1.y, p.lvl, 1, 1);
        emit_vertex(q.v1.x, q.v0.y, p.lvl, 1, 0);
        break;
      case voxels::Z_POS:
        emit_vertex(q.v0.x, q.v0.y, p.lvl, 0, 0);
        emit_vertex(q.v1.x, q.v0.y, p.lvl, 1, 0);
        emit_vertex(q.v1.x, q.v1.y, p.lvl, 1, 1);
        emit_vertex(q.v0.x, q.v1.y, p.lvl, 0, 1);
        break;
    }

    for (const auto i : voxels::face_indices()) {
      mesh.indices.emplace_back(index_offset + i);
    }

    faces_offset += face_w * face_h;
    index_offset += 4;
  }

  return mesh;
}

template <typename OcclusionFn, typename TextureFn>
inline auto to_compact_mesh(
    const VolumeBlock<Material>& block,
    const Vec3i& offset,
    OcclusionFn&& occlusion_fn,
    TextureFn&& texture_fn) {
  // Emit faces along each direction adjacent to an empty voxel.
  voxels::VoxelQuadifier<Material> quadifier;
  block.scan([&](auto bx, auto by, auto bz, Material m) {
    auto x = static_cast<int>(bx);
    auto y = static_cast<int>(by);
    auto z = static_cast<int>(bz);
    quadifier.push(x, y, z, m, [&](Vec3i pos) {
      auto global = offset + pos;
      return !occlusion_fn(global.x, global.y, global.z);
    });
  });

  return to_compact_mesh<TextureFn>(
      quadifier.build(), offset, std::forward<TextureFn>(texture_fn));
}

// Invokes the given function on all unit-sized faces in the given mesh.
template <typename Fn>
inline void scan_faces(const CompactMesh& mesh, Fn&& fn) {
  auto vertex_position = [](const CompactVertex& vertex) {
    const auto& attr = vertex.attr;
    return Vec3<int>{
        static_cast<int>((attr >> 17) & 0x3f),
        static_cast<int>((attr >> 11) & 0x3f),
        static_cast<int>((attr >> 5) & 0x3f),
    };
  };

  for (size_t i = 0; i < mesh.vertices.size(); i += 4) {
    auto [x0, y0, z0] = vertex_position(mesh.vertices[i]);
    auto [x1, y1, z1] = vertex_position(mesh.vertices[i + 2]);
    auto dir = static_cast<voxels::Dir>((mesh.vertices[i].attr >> 2) & 0x7);

    auto xs = x1 - x0 < 0 ? -1 : 1;
    auto ys = y1 - y0 < 0 ? -1 : 1;
    auto zs = z1 - z0 < 0 ? -1 : 1;

    if (x0 == x1) {
      for (auto y = y0; y != y1; y += ys) {
        for (auto z = z0; z != z1; z += zs) {
          fn(vec3(x0, y, z), vec3(x0, y + ys, z + zs), dir);
        }
      }
    } else if (y0 == y1) {
      for (auto z = z0; z != z1; z += zs) {
        for (auto x = x0; x != x1; x += xs) {
          fn(vec3(x, y0, z), vec3(x + xs, y0, z + zs), dir);
        }
      }
    } else {
      for (auto y = y0; y != y1; y += ys) {
        for (auto x = x0; x != x1; x += xs) {
          fn(vec3(x, y, z0), vec3(x + xs, y + ys, z0), dir);
        }
      }
    }
  }
}

template <typename Fn>
inline void sample_faces(const CompactMesh& mesh, uint32_t dim, Fn&& fn) {
  CHECK_ARGUMENT(dim > 0);
  float step = 1.0f / static_cast<float>(dim);

  scan_faces(mesh, [&](Vec3i v0, Vec3i v1, voxels::Dir dir) {
    auto [x0, y0, z0] = v0.to<float>();
    auto [x1, y1, z1] = v1.to<float>();
    if (x0 == x1) {
      float y = y0 + 0.5 * step;
      for (uint32_t i = 0; i < dim; i += 1) {
        float z = z0 + 0.5 * step;
        for (uint32_t j = 0; j < dim; j += 1) {
          fn(vec3(x0, y, z), dir);
          z += step;
        }
        y += step;
      }
    } else if (y0 == y1) {
      float z = z0 + 0.5 * step;
      for (uint32_t i = 0; i < dim; i += 1) {
        float x = x0 + 0.5 * step;
        for (uint32_t j = 0; j < dim; j += 1) {
          fn(vec3(x, y0, z), dir);
          x += step;
        }
        z += step;
      }
    } else {
      float y = y0 + 0.5 * step;
      for (uint32_t i = 0; i < dim; i += 1) {
        float x = x0 + 0.5 * step;
        for (uint32_t j = 0; j < dim; j += 1) {
          fn(vec3(x, y, z0), dir);
          x += step;
        }
        y += step;
      }
    }
  });
}

struct LightMap {
  std::vector<uint8_t> data;
  Vec3i shape;  // w, h, tile_dim
};

template <typename OcclusionFn, typename AmbientFn>
inline auto compute_light_map(
    const CompactMesh& mesh,
    OcclusionFn&& occlusion_fn,
    AmbientFn&& ambient_fn) {
  static const uint32_t width = 512;
  static const uint32_t tile_dim = 2;

  std::vector<uint8_t> samples;
  sample_faces(mesh, tile_dim, [&](Vec3f pos, ATTR_UNUSED voxels::Dir dir) {
    auto bit = [&](auto x, auto y, auto z) {
      auto s = vec3(x - 0.5f, y - 0.5f, z - 0.5f);
      auto p = mesh.offset + ifloor(pos + s);
      return occlusion_fn(p.x, p.y, p.z);
    };

    uint8_t mask = 0;
    mask += bit(0, 0, 0) << 0;
    mask += bit(1, 0, 0) << 1;
    mask += bit(0, 1, 0) << 2;
    mask += bit(1, 1, 0) << 3;
    mask += bit(0, 0, 1) << 4;
    mask += bit(1, 0, 1) << 5;
    mask += bit(0, 1, 1) << 6;
    mask += bit(1, 1, 1) << 7;
    auto ambient_occlusion = static_cast<uint8_t>(255 * ambient_fn(mask));

    samples.push_back(ambient_occlusion);
  });

  LightMap ret;

  // Figure out the output shape.
  ret.shape.x = width;
  ret.shape.y = round_up_to_power_of_two(
      tile_dim * (samples.size() / tile_dim / width + 1));
  ret.shape.z = tile_dim;

  // Copy the sample data to the output map.
  size_t i = 0;
  ret.data.resize(ret.shape.x * ret.shape.y);
  for (uint32_t row = 0; row < ret.shape.y / tile_dim; row += 1) {
    for (uint32_t col = 0; col < ret.shape.x / tile_dim; col += 1) {
      for (uint32_t tile_y = 0; tile_y < tile_dim; tile_y += 1) {
        for (uint32_t tile_x = 0; tile_x < tile_dim; tile_x += 1) {
          if (i >= samples.size()) {
            break;
          }
          auto x = col * tile_dim + tile_x;
          auto y = row * tile_dim + tile_y;
          ret.data[x + y * width] = samples[i];
          i += 1;
        }
      }
    }
  }

  return ret;
}

// Compute which sides of a given blob can be accessed from each other.
// The returned mask compactly represents whether face A and B are connected,
// iff mask & (1 << (B * 5 + A)) != 0.
// The faces are voxels::Dir, and B > A
uint32_t traverse_mask(const tensors::Tensor<uint32_t>& terrain);

struct AABB {
  Vec3f v0;
  Vec3f v1;
};

class BoxBlock {
 public:
  explicit BoxBlock(std::vector<voxels::Box> boxes)
      : boxes_(std::move(boxes)) {}

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& b : boxes_) {
      fn(b);
    }
  }

  template <typename Fn>
  void intersect(const AABB& aabb, Fn&& fn) const {
    for (const auto& b : boxes_) {
      auto v0 = max(b.v0.to<float>(), aabb.v0);
      auto v1 = min(b.v1.to<float>(), aabb.v1);
      if (v0.x < v1.x && v0.y < v1.y && v0.z < v1.z) {
        if constexpr (std::is_same_v<decltype(fn(b)), bool>) {
          if (fn(b)) {
            return;
          }
        } else {
          fn(b);
        }
      }
    }
  }

 private:
  std::vector<voxels::Box> boxes_;
};

inline auto to_boxes(const VolumeBlock<bool>& block, const Vec3i& offset) {
  std::vector<voxels::Box> ret;
  block.scan_boxes([&](voxels::Box b) {
    b.v0 += offset;
    b.v1 += offset;
    ret.emplace_back(std::move(b));
  });
  return BoxBlock(std::move(ret));
}

inline bool intersect_ray_aabb(
    const Vec3f& origin, const Vec3f& dir, const AABB& aabb) {
  auto n = normalized(dir);
  auto n_inv = 1.f / n;
  auto t1 = (aabb.v0 - origin) * n_inv;
  auto t2 = (aabb.v1 - origin) * n_inv;
  auto tmin = min(t1, t2);
  auto tmax = max(t1, t2);
  return std::min({tmax.x, tmax.y, tmax.z}) >=
         std::max({tmin.x, tmin.y, tmin.z, 0.f});
}

class OcclusionMask {
 public:
  enum OcclusionSummary {
    EMPTY,  // There are no occluders in the entire set of voxels.
    FULL,   // There are all occluders in the entire set of voxels.
    MIXED,  // In a set of voxels, some occlude, and some do not.
  };

  explicit OcclusionMask(
      std::unique_ptr<std::bitset<shards::kMaxBlockSize>> mask);

  bool get(uint32_t index) const {
    return volume_occlusion_summary_ == MIXED
               ? mask_->test(index)
               : (volume_occlusion_summary_ == FULL);
  }

  auto face_occlusion_summary(voxels::Dir face_dir) const {
    return face_occlusion_summary_[face_dir];
  }
  auto volume_occlusion_summary() const {
    return volume_occlusion_summary_;
  }

 private:
  // This rather large object only exists if volume_occlusion_summary_ ==
  // MIXED.
  std::unique_ptr<std::bitset<shards::kMaxBlockSize>> mask_;

  // Intended to be indexed by the Dir enum. Represents whether all blocks
  // along each of a shard's face are occluded or not.
  std::array<OcclusionSummary, 6> face_occlusion_summary_;
  // Represents whether all shards in a voxel are occluded or not.
  OcclusionSummary volume_occlusion_summary_;
};

template <typename OcclusionFn>
inline auto to_occlusion_mask(
    const VolumeBlock<Material>& block, OcclusionFn&& occlusion_fn) {
  std::unique_ptr<std::bitset<shards::kMaxBlockSize>> mask;

  block.scan_runs([&](runs::Span span, Material m) {
    for (auto code = span.lo; code < span.hi; code += 1) {
      if (!mask) {
        mask.reset(new std::bitset<shards::kMaxBlockSize>());
      }
      mask->set(code, occlusion_fn(m));
    }
  });

  return OcclusionMask(std::move(mask));
}

}  // namespace voxeloo::biomes

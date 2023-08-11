#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cmath>
#include <cstdint>
#include <string>
#include <thread>

#include "voxeloo/biomes/biomes.hpp"
#include "voxeloo/biomes/memoize.hpp"
#include "voxeloo/biomes/migration.hpp"
#include "voxeloo/biomes/shards.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/runs.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/js_ext/memory.hpp"
#include "voxeloo/js_ext/shards.hpp"
#include "voxeloo/js_ext/values.hpp"

namespace voxeloo::biomes::js {

namespace js = voxeloo::js;

template <typename Val>
using BufferJs = buffers::js::BufferJs<Val>;

template <typename Val>
inline std::string value_type();

using Pos = Vec3i;

// TODO(taylor): Implement copy on write.
template <typename Val>
class SparseBlockJs {
 public:
  SparseBlockJs() = default;
  explicit SparseBlockJs(SparseBlock<Val> impl) : impl_(std::move(impl)) {}

  void set(uint32_t x, uint32_t y, uint32_t z, Val v) {
    impl_.set(x, y, z, v);
  }

  auto has(uint32_t x, uint32_t y, uint32_t z) const {
    return impl_.has(x, y, z);
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    if (auto v = impl_.get(x, y, z); v) {
      return emscripten::val(*v);
    }
    return emscripten::val::undefined();
  }

  void del(uint32_t x, uint32_t y, uint32_t z) {
    impl_.del(x, y, z);
  }

  void clear() {
    impl_.clear();
  }

  auto size() const {
    return impl_.size();
  }

  auto empty() const {
    return impl_.empty();
  }

  void scan(emscripten::val callback) const {
    impl_.scan([&](uint32_t x, uint32_t y, uint32_t z, const Val& val) {
      callback(x, y, z, val);
    });
  }

  auto clone() const {
    return SparseBlockJs(impl_);
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(impl_));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(impl_, transport::from_base64(blob));
  }

  auto value_type() {
    return values::js::value_type<Val>();
  }

  void to_list(BufferJs<Pos>& pos, BufferJs<Val>& val) {
    tensors::BufferBuilder<Pos> pos_builder(size());
    tensors::BufferBuilder<Val> val_builder(size());
    impl_.scan([&](auto x, auto y, auto z, auto v) {
      pos_builder.add(vec3(x, y, z).template to<int>());
      val_builder.add(v);
    });
    pos.impl = std::move(pos_builder).build();
    val.impl = std::move(val_builder).build();
  }

  void save_buffer(BufferJs<uint8_t>& buffer) {
    auto blob = transport::to_compressed_blob(impl_);
    buffer.resize(blob.size());
    std::copy(blob.begin(), blob.end(), buffer.impl.data());
  }

  void load_buffer(const BufferJs<uint8_t>& buffer) {
    transport::from_compressed_blob(impl_, buffer.data(), buffer.size());
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  SparseBlock<Val> impl_;
};

// TODO(taylor): Implement copy on write.
template <typename Val>
class VolumeBlockJs {
 public:
  VolumeBlockJs() = default;
  explicit VolumeBlockJs(VolumeBlock<Val> impl) : impl_(std::move(impl)) {}

  void compact() {
    impl_.compact();
  }

  void set(uint32_t x, uint32_t y, uint32_t z, Val v) {
    impl_.set(x, y, z, std::move(v));
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    return impl_.get(x, y, z);
  }

  void fill(Val fill) {
    impl_.fill(fill);
  }

  void assign(const SparseBlockJs<Val>& edits) {
    impl_.assign(edits.impl());
  }

  void scan(emscripten::val callback) {
    impl_.scan([&](uint32_t x, uint32_t y, uint32_t z, const Val& val) {
      callback(x, y, z, val);
    });
  }

  auto mask() {
    return VolumeBlockJs<bool>(impl_.mask());
  }

  auto empty() const {
    auto ret = false;
    impl_.scan_runs([&](ATTR_UNUSED runs::Span span, const Val& val) {
      ret = ret || val;
    });
    return !ret;
  }

  auto clone() {
    return VolumeBlockJs(impl_);
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(impl_));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(impl_, transport::from_base64(blob));
  }

  void save_buffer(BufferJs<uint8_t>& buffer) {
    auto blob = transport::to_compressed_blob(impl_);
    buffer.resize(blob.size());
    std::copy(blob.begin(), blob.end(), buffer.data());
  }

  void load_buffer(const BufferJs<uint8_t>& buffer) {
    transport::from_compressed_blob(impl_, buffer.data(), buffer.size());
  }

  auto value_type() {
    return values::js::value_type<Val>();
  }

  void to_list(BufferJs<Pos>& pos, BufferJs<Val>& val) {
    size_t size = 0;
    impl_.scan_runs([&](ATTR_UNUSED runs::Span span, Val val) {
      size += span.hi - span.lo;
    });

    tensors::BufferBuilder<Pos> pos_builder(size);
    tensors::BufferBuilder<Val> val_builder(size);
    impl_.scan([&](auto x, auto y, auto z, auto v) {
      pos_builder.add(vec3(x, y, z).template to<int>());
      val_builder.add(v);
    });
    pos.impl = std::move(pos_builder).build();
    val.impl = std::move(val_builder).build();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  VolumeBlock<Val> impl_;
};

template <typename Val>
class IndexJs {
 public:
  IndexJs() = default;
  explicit IndexJs(runs::Index<Val> impl) : impl_(std::move(impl)) {}

  auto size() const {
    return impl_.size();
  }

  auto get(runs::Pos pos) const {
    return impl_.get(pos);
  }

  void scan(emscripten::val callback) {
    impl_.scan([&](runs::Span pos, const Val& val) {
      callback(pos, val);
    });
  }

  void save(BufferJs<uint8_t>& buffer) {
    auto blob = transport::to_blob(impl_);
    buffer.resize(blob.size());
    std::copy(blob.begin(), blob.end(), buffer.data());
  }

  void load(const BufferJs<uint8_t>& buffer) {
    transport::from_blob(impl_, buffer.data(), buffer.size());
  }

  auto value_type() {
    return values::js::value_type<Val>();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  runs::Index<Val> impl_;
};

template <typename Val>
class IndexBuilderJs {
 public:
  IndexBuilderJs(runs::Pos pos, Val fill) : impl_(pos, fill) {}
  explicit IndexBuilderJs(runs::IndexBuilder<Val> impl)
      : impl_(std::move(impl)) {}

  auto add_span(runs::Span span, Val val) {
    return impl_.add(span, val);
  }

  auto add(runs::Pos pos, Val val) {
    impl_.add(pos, val);
  }

  auto build() {
    return IndexJs<Val>(impl_.build());
  }

  auto value_type() {
    return values::js::value_type<Val>();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  runs::IndexBuilder<Val> impl_;
};

template <typename Val>
class SparseMapJs {
 public:
  SparseMapJs() = default;
  explicit SparseMapJs(SparseMap<Val> impl) : impl_(std::move(impl)) {}

  void set(int x, int y, int z, Val v) {
    impl_.set(x, y, z, std::move(v));
  }

  auto has(int x, int y, int z) const {
    return impl_.has(x, y, z);
  }

  auto get(int x, int y, int z) const {
    if (impl_.has(x, y, z)) {
      return emscripten::val(impl_.get(x, y, z));
    }
    return emscripten::val::undefined();
  }

  void assign(int x, int y, int z, const SparseBlockJs<Val>& block) {
    impl_.assign(x, y, z, block.impl());
  }

  auto find(Val tgt, emscripten::val callback) const {
    impl_.scan([&](int x, int y, int z, const Val& val) {
      if (val == tgt) {
        callback(x, y, z);
      }
    });
  }

  void scan(emscripten::val callback) {
    impl_.scan([&](int x, int y, int z, const Val& val) {
      callback(x, y, z, val);
    });
  }

  void del(int x, int y, int z) {
    impl_.del(x, y, z);
  }

  void clear() {
    impl_.clear();
  }

  auto size() const {
    return impl_.size();
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(impl_));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(impl_, transport::from_base64(blob));
  }

  auto storage_size() const {
    return impl_.storage_size();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  SparseMap<Val> impl_;
};

template <typename Val>
class VolumeMapJs {
 public:
  VolumeMapJs() = default;
  explicit VolumeMapJs(VolumeMap<Val> impl) : impl_(std::move(impl)) {}

  void set(int x, int y, int z, Val v) {
    impl_.set(x, y, z, std::move(v));
  }

  auto get(int x, int y, int z) const {
    return impl_.get(x, y, z);
  }

  void assign(int x, int y, int z, const VolumeBlockJs<Val>& block) {
    impl_.assign(x, y, z, block.impl());
  }

  auto find(Val tgt, emscripten::val callback) const {
    impl_.scan_runs([&](auto pos, auto len, auto val) {
      if (val == tgt) {
        auto [x, y, z] = pos;
        for (int i = 0; i < len; i += 1) {
          callback(x + i, y, z);
        }
      }
    });
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(impl_));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(impl_, transport::from_base64(blob));
  }

  auto storage_size() const {
    return impl_.storage_size();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  mutable VolumeMap<Val> impl_;
};

// TODO(taylor): Consider accepting any JS value and a hash function.
class SparseTableJs {
 public:
  void set(uint32_t x, uint32_t y, uint32_t z, std::string s) {
    impl_.set(x, y, z, std::move(s));
  }

  auto has(uint32_t x, uint32_t y, uint32_t z) const {
    return impl_.get(x, y, z).has_value();
  }

  auto get(uint32_t x, uint32_t y, uint32_t z) const {
    if (auto v = impl_.get(x, y, z); v) {
      return emscripten::val(*v);
    }
    return emscripten::val::undefined();
  }

  void del(uint32_t x, uint32_t y, uint32_t z) {
    impl_.del(x, y, z);
  }

  void clear() {
    impl_.clear();
  }

  auto size() {
    return impl_.size();
  }

  auto empty() {
    return impl_.empty();
  }

  void scan(emscripten::val callback) const {
    impl_.scan([&](uint32_t x, uint32_t y, uint32_t z, const std::string& val) {
      callback(x, y, z, val);
    });
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(impl_));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(impl_, transport::from_base64(blob));
  }

 private:
  SparseTable<std::string> impl_;
};

class BiomesMeshJs {
 public:
  explicit BiomesMeshJs(BiomesMesh mesh) : mesh_(std::move(mesh)) {}

  auto stride() {
    return sizeof(BiomesVertex) / sizeof(float);
  }

  auto empty() {
    return mesh_.indices.empty();
  }

  auto indices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        mesh_.indices.size(),
        reinterpret_cast<const uint32_t*>(mesh_.indices.data())));
  }

  auto vertices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        mesh_.vertices.size() * stride(),
        reinterpret_cast<const float*>(mesh_.vertices.data())));
  }

  const auto& impl() const {
    return mesh_;
  }

 private:
  const BiomesMesh mesh_;
};

class CompactMeshJs {
 public:
  explicit CompactMeshJs(CompactMesh mesh) : mesh_(std::move(mesh)) {}

  auto origin() {
    return mesh_.offset;
  }

  auto stride() {
    return sizeof(CompactVertex) / sizeof(uint32_t);
  }

  auto empty() {
    return mesh_.indices.empty();
  }

  auto indices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        mesh_.indices.size(),
        reinterpret_cast<const uint32_t*>(mesh_.indices.data())));
  }

  auto vertices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        mesh_.vertices.size() * stride(),
        reinterpret_cast<const float*>(mesh_.vertices.data())));
  }

  const auto& impl() const {
    return mesh_;
  }

 private:
  const CompactMesh mesh_;
};

class GroupedMeshJs {
 public:
  explicit GroupedMeshJs(GroupedMesh mesh) {
    vertices_.swap(mesh.vertices);
    for (auto& group : mesh.indices) {
      counts_.push_back(group.size());
      starts_.push_back(indices_.size());
      indices_.insert(indices_.end(), group.begin(), group.end());
    }
    for (auto& group : mesh.groups) {
      materials_.push_back(group.mat);
      directions_.push_back(group.dir);
    }
  }

  auto empty() {
    return indices_.empty();
  }

  auto stride() {
    return sizeof(GroupedVertex) / sizeof(float);
  }

  auto groups() {
    return materials_.size();
  }

  auto starts(size_t index) {
    return starts_.at(index);
  }

  auto counts(size_t index) {
    return counts_.at(index);
  }

  auto group_view(size_t index) {
    const auto cnt = counts_.at(index);
    const auto ptr = &indices_.at(starts_.at(index));
    return emscripten::val(emscripten::typed_memory_view(cnt, ptr));
  }

  auto indices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        indices_.size(), reinterpret_cast<const uint32_t*>(indices_.data())));
  }

  auto vertices_view() {
    return emscripten::val(emscripten::typed_memory_view(
        vertices_.size() * stride(),
        reinterpret_cast<const float*>(vertices_.data())));
  }

  auto materials_view() {
    return emscripten::val(emscripten::typed_memory_view(
        materials_.size(),
        reinterpret_cast<const uint32_t*>(materials_.data())));
  }

  auto directions_view() {
    return emscripten::val(emscripten::typed_memory_view(
        directions_.size(), reinterpret_cast<const int*>(directions_.data())));
  }

 private:
  std::vector<GroupedVertex> vertices_;
  std::vector<uint32_t> indices_;
  std::vector<size_t> starts_;
  std::vector<size_t> counts_;
  std::vector<Material> materials_;
  std::vector<voxels::Dir> directions_;
};

class TextureMap {
 public:
  auto key(Material mat, voxels::Dir dir) const {
    return 6 * static_cast<uint64_t>(mat) + static_cast<uint64_t>(dir);
  }

  auto get(Material mat, int dir) const {
    return map_.at(key(mat, static_cast<voxels::Dir>(dir)));
  }

  auto set(Material mat, int dir, uint32_t index) {
    CHECK_ARGUMENT(0 <= dir && dir < 6);
    return map_[key(mat, static_cast<voxels::Dir>(dir))] = index;
  }

 private:
  spatial::UnorderedMap<uint64_t, uint32_t> map_;
};

class OcclusionMap {
 public:
  auto get(Material mat) const {
    return map_.at(mat);
  }

  auto set(Material mat) {
    map_[mat] = true;
  }

 private:
  spatial::UnorderedMap<Material, bool> map_;
};

inline auto to_occlusion_mask_js(
    const VolumeBlockJs<Material>& block, const OcclusionMap& occlusion_map) {
  auto occlusion_fn = [&](Material mat) {
    return occlusion_map.get(mat);
  };
  return to_occlusion_mask(block.impl(), occlusion_fn);
}

inline auto to_mesh_js(
    const VolumeBlockJs<Material>& block,
    Vec3i offset,
    const TextureMap& textures) {
  return BiomesMeshJs(
      to_biomes_mesh(block.impl(), offset, [&](auto mat, auto dir) {
        return static_cast<int>(textures.get(mat, dir));
      }));
};

inline auto sparse_map_to_mesh_js(
    const SparseMapJs<Material>& map, const TextureMap& textures) {
  return BiomesMeshJs(to_biomes_mesh(map.impl(), [&](auto mat, auto dir) {
    return static_cast<int>(textures.get(mat, dir));
  }));
};

inline auto volume_map_to_mesh_js(
    const VolumeMapJs<Material>& map, const TextureMap& textures) {
  return BiomesMeshJs(to_biomes_mesh(map.impl(), [&](auto mat, auto dir) {
    return static_cast<int>(textures.get(mat, dir));
  }));
};

inline auto to_compact_mesh_js(
    const VolumeBlockJs<Material>& block,
    Vec3i offset,
    const TextureMap& textures,
    emscripten::val mask_loader) {
  MemoizeLastAll cache([&](int x, int y, int z) -> const OcclusionMask* {
    auto val = mask_loader(shards::js::shard_encode_js({x, y, z}));
    if (!val.isNull() && !val.isUndefined()) {
      return js::as_ptr<OcclusionMask>(val);
    }
    return nullptr;
  });

  return CompactMeshJs(to_compact_mesh(
      block.impl(),
      offset,
      [&](int x, int y, int z) {
        auto pos = vec3(x, y, z);
        auto shard = shards::shard_div(shards::kBlockLvl, pos);
        auto local = pos - (shard * static_cast<int>(shards::kBlockDim));
        auto mask = cache(shard.x, shard.y, shard.z);
        if (mask) {
          return mask->get(shards::block_encode(local.x, local.y, local.z));
        }
        return false;
      },
      [&](auto mat, auto dir) {
        return static_cast<uint32_t>(textures.get(mat, dir));
      }));
};

class LightMapJs {
 public:
  explicit LightMapJs(LightMap light_map) : light_map_(std::move(light_map)) {}

  auto data() {
    auto n = light_map_.data.size();
    auto p = light_map_.data.data();
    return emscripten::val(emscripten::typed_memory_view(n, p));
  }

  auto shape() {
    return light_map_.shape;
  }

  const auto& impl() const {
    return light_map_;
  }

 private:
  const LightMap light_map_;
};

class AmbientOcclusionMapJs {
 public:
  AmbientOcclusionMapJs() : map_(256) {}

  void set(uint8_t mask, float value) {
    map_[mask] = value;
  }

  auto get(uint8_t mask) const {
    return map_[mask];
  }

 private:
  std::vector<float> map_;
};

inline auto compute_light_map_js(
    const CompactMeshJs& mesh,
    emscripten::val mask_loader,
    const AmbientOcclusionMapJs& ambient_map) {
  MemoizeLastAll cache([&](int x, int y, int z) -> const OcclusionMask* {
    auto val = mask_loader(shards::js::shard_encode_js({x, y, z}));
    if (!val.isNull() && !val.isUndefined()) {
      return js::as_ptr<OcclusionMask>(val);
    }
    return nullptr;
  });

  auto occlusion_fn = [&](int x, int y, int z) {
    auto [shard, local] = shards::block_partition({x, y, z});
    auto mask = cache(shard.x, shard.y, shard.z);
    return mask ? mask->get(shards::block_encode(local)) : false;
  };

  auto ambient_fn = [&](uint8_t mask) {
    return ambient_map.get(mask);
  };

  return LightMapJs(compute_light_map(mesh.impl(), occlusion_fn, ambient_fn));
};

// Compute which sides of a given blob can be accessed from each other.
// The returned mask compactly represents whether face A and B are connected,
// iff mask & (1 << (B * 5 + A)) != 0.
// The faces are voxels::Dir, and B > A
inline auto traverse_mask_js(
    const std::string& seed_blob,
    const std::string& edits_blob,
    const std::string& shapes_blob) {
  VolumeBlock<uint32_t> seed;
  transport::from_compressed_blob(seed, transport::from_base64(seed_blob));
  if (!edits_blob.empty()) {
    SparseBlock<uint32_t> edits;
    transport::from_compressed_blob(edits, transport::from_base64(edits_blob));
    seed.assign(edits);
  }
  if (!shapes_blob.empty()) {
    SparseBlock<uint32_t> shapes;
    transport::from_compressed_blob(
        shapes, transport::from_base64(shapes_blob));
    shapes.scan([&](auto x, auto y, auto z, auto id) {
      if (id != 0) {
        seed.set(x, y, z, 0);
      }
    });
  }
  return traverse_mask(biomes::migration::tensor_from_volume_block(seed));
}

inline auto group_mesh_js(const BiomesMeshJs& mesh) {
  return GroupedMeshJs(to_grouped_mesh(mesh.impl()));
};

inline auto sparse_map_to_grouped_mesh_js(const SparseMapJs<Material>& map) {
  return GroupedMeshJs(to_grouped_mesh(map.impl()));
};

inline auto volume_map_to_grouped_mesh_js(const VolumeMapJs<Material>& map) {
  return GroupedMeshJs(to_grouped_mesh(map.impl()));
};

class BoxBlockJs {
 public:
  explicit BoxBlockJs(BoxBlock impl) : impl_(std::move(impl)) {}

  void scan(emscripten::val callback) {
    impl_.scan([&](const voxels::Box& b) {
      callback(AABB{b.v0.to<float>(), b.v1.to<float>()});
    });
  }

  void intersect(const AABB& aabb, emscripten::val callback) {
    impl_.intersect(aabb, [&](const voxels::Box& b) {
      return callback(AABB{b.v0.to<float>(), b.v1.to<float>()}).as<bool>();
    });
  }

 private:
  const BoxBlock impl_;
};

inline auto to_boxes_js(VolumeBlockJs<bool>& block, const Vec3i& offset) {
  return BoxBlockJs(to_boxes(block.impl(), offset));
}

inline bool intersect_ray_aabb_js(
    const Vec3f& origin, const Vec3f& dir, const AABB& aabb) {
  return intersect_ray_aabb(origin, dir, aabb);
};

template <typename ReduceType, typename Val>
inline auto value_counts_js(const ReduceType& map) {
  std::map<Val, int> counts;
  map.impl().scan([&](ATTR_UNUSED uint32_t x,
                      ATTR_UNUSED uint32_t y,
                      ATTR_UNUSED uint32_t z,
                      const Val& val) {
    counts[val] += 1;
  });
  return counts;
}

template <typename Val>
inline auto volume_block_to_dense_array_js(const VolumeBlockJs<Val>& block) {
  std::vector<Val> ret;
  ret.reserve(shards::kBlockDim * shards::kBlockDim * shards::kBlockDim);
  block.impl().impl().scan([&](auto span, const Val& val) {
    for (auto i = span.lo; i < span.hi; i += 1) {
      ret.push_back(val);
    }
  });
  return ret;
}

template <typename Val>
inline void bind_sparse_block(const char* name) {
  using T = SparseBlockJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<>()
      .function("set", &T::set)
      .function("has", &T::has)
      .function("get", &T::get)
      .function("del", &T::del)
      .function("scan", &T::scan)
      .function("size", &T::size)
      .function("empty", &T::empty)
      .function("clear", &T::clear)
      .function("clone", &T::clone)
      .function("save", &T::save)
      .function("load", &T::load)
      .function("toList", &T::to_list)
      .function("valueType", &T::value_type)
      .function("saveBuffer", &T::save_buffer)
      .function("loadBuffer", &T::load_buffer);
}

template <typename Val>
inline void bind_volume_block(const char* name) {
  using T = VolumeBlockJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<>()
      .function("set", &T::set)
      .function("get", &T::get)
      .function("fill", &T::fill)
      .function("scan", &T::scan)
      .function("mask", &T::mask)
      .function("empty", &T::empty)
      .function("clone", &T::clone)
      .function("assign", &T::assign)
      .function("compact", &T::compact)
      .function("save", &T::save)
      .function("load", &T::load)
      .function("toList", &T::to_list)
      .function("valueType", &T::value_type)
      .function("saveBuffer", &T::save_buffer)
      .function("loadBuffer", &T::load_buffer);
}

template <typename Val>
inline void bind_index(const char* name) {
  using T = IndexJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<>()
      .function("size", &T::size)
      .function("scan", &T::scan)
      .function("get", &T::get)
      .function("save", &T::save)
      .function("load", &T::load);
}

template <typename Val>
inline void bind_index_builder(const char* name) {
  using T = IndexBuilderJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<runs::Pos, Val>()
      .function("add", &T::add)
      .function("addSpan", &T::add_span)
      .function("build", &T::build);
}

template <typename Val>
inline void bind_sparse_map(const char* name) {
  using T = SparseMapJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<>()
      .function("set", &T::set)
      .function("has", &T::has)
      .function("get", &T::get)
      .function("del", &T::del)
      .function("assign", &T::assign)
      .function("find", &T::find)
      .function("scan", &T::scan)
      .function("clear", &T::clear)
      .function("size", &T::size)
      .function("save", &T::save)
      .function("load", &T::load)
      .function("storageSize", &T::storage_size);
}

template <typename Val>
inline void bind_volume_map(const char* name) {
  using T = VolumeMapJs<Val>;
  emscripten::class_<T>(name)
      .template constructor<>()
      .function("set", &T::set)
      .function("get", &T::get)
      .function("assign", &T::assign)
      .function("find", &T::find)
      .function("save", &T::save)
      .function("load", &T::load)
      .function("storageSize", &T::storage_size);
}

inline int thread_test() {
  int local_variable = 100;
  std::thread th{[=]() {
    std::cout << "The Value of local variable => " << local_variable
              << std::endl;
  }};
  std::thread th2{[=]() {
    std::cout << "The Value of local variable => " << local_variable
              << std::endl;
  }};

  return local_variable;
}

template <typename Val>
inline auto typed_vector_view(const std::vector<Val>& v) {
  return emscripten::val{emscripten::typed_memory_view(v.size(), v.data())};
}

template <typename Val>
inline auto register_vector_methods(const std::string& baseName) {
  using namespace emscripten;  // NOLINT
  register_vector<Val>(baseName.data());
  function(("typed_view_" + baseName).data(), &typed_vector_view<Val>);
}

inline void bind() {
  using namespace emscripten;  // NOLINT

  // Bind STL types
  register_vector_methods<int8_t>("Vector_I8");
  register_vector_methods<int16_t>("Vector_I16");
  register_vector_methods<int32_t>("Vector_I32");
  register_vector_methods<uint8_t>("Vector_U8");
  register_vector_methods<uint16_t>("Vector_U16");
  register_vector_methods<uint32_t>("Vector_U32");
  register_vector_methods<float>("Vector_F32");
  register_vector_methods<double>("Vector_F64");

  register_map<uint32_t, int>("Map_U32Int");

  // Bind SparseBlock type.
  bind_sparse_block<bool>("SparseBlock_Bool");
  bind_sparse_block<int8_t>("SparseBlock_I8");
  bind_sparse_block<int16_t>("SparseBlock_I16");
  bind_sparse_block<int32_t>("SparseBlock_I32");
  bind_sparse_block<uint8_t>("SparseBlock_U8");
  bind_sparse_block<uint16_t>("SparseBlock_U16");
  bind_sparse_block<uint32_t>("SparseBlock_U32");
  bind_sparse_block<float>("SparseBlock_F32");
  bind_sparse_block<double>("SparseBlock_F64");

  // Bind VolumeBlock type.
  bind_volume_block<bool>("VolumeBlock_Bool");
  bind_volume_block<int8_t>("VolumeBlock_I8");
  bind_volume_block<int16_t>("VolumeBlock_I16");
  bind_volume_block<int32_t>("VolumeBlock_I32");
  bind_volume_block<uint8_t>("VolumeBlock_U8");
  bind_volume_block<uint16_t>("VolumeBlock_U16");
  bind_volume_block<uint32_t>("VolumeBlock_U32");

  bind_index<int8_t>("Index_I8");
  bind_index<int16_t>("Index_I16");
  bind_index<int32_t>("Index_I32");
  bind_index<int64_t>("Index_I64");
  bind_index<uint8_t>("Index_U8");
  bind_index<uint16_t>("Index_U16");
  bind_index<uint32_t>("Index_U32");
  bind_index<uint64_t>("Index_U64");

  bind_index_builder<int8_t>("IndexBuilder_I8");
  bind_index_builder<int16_t>("IndexBuilder_I16");
  bind_index_builder<int32_t>("IndexBuilder_I32");
  bind_index_builder<int64_t>("IndexBuilder_I64");
  bind_index_builder<uint8_t>("IndexBuilder_U8");
  bind_index_builder<uint16_t>("IndexBuilder_U16");
  bind_index_builder<uint32_t>("IndexBuilder_U32");
  bind_index_builder<uint64_t>("IndexBuilder_U64");

  // Bind SparseMap type.
  bind_sparse_map<bool>("SparseMap_Bool");
  bind_sparse_map<int8_t>("SparseMap_I8");
  bind_sparse_map<int16_t>("SparseMap_I16");
  bind_sparse_map<int32_t>("SparseMap_I32");
  bind_sparse_map<uint8_t>("SparseMap_U8");
  bind_sparse_map<uint16_t>("SparseMap_U16");
  bind_sparse_map<uint32_t>("SparseMap_U32");
  bind_sparse_map<float>("SparseMap_F32");
  bind_sparse_map<double>("SparseMap_F64");

  // Bind VolumeMap type.
  bind_volume_map<bool>("VolumeMap_Bool");
  bind_volume_map<int8_t>("VolumeMap_I8");
  bind_volume_map<int16_t>("VolumeMap_I16");
  bind_volume_map<int32_t>("VolumeMap_I32");
  bind_volume_map<uint8_t>("VolumeMap_U8");
  bind_volume_map<uint16_t>("VolumeMap_U16");
  bind_volume_map<uint32_t>("VolumeMap_U32");

  // Bind SparseTable type.
  class_<SparseTableJs>("SparseTable")
      .constructor()
      .function("set", &SparseTableJs::set)
      .function("has", &SparseTableJs::has)
      .function("get", &SparseTableJs::get)
      .function("del", &SparseTableJs::del)
      .function("clear", &SparseTableJs::clear)
      .function("size", &SparseTableJs::size)
      .function("empty", &SparseTableJs::empty)
      .function("scan", &SparseTableJs::scan)
      .function("save", &SparseTableJs::save)
      .function("load", &SparseTableJs::load);

  // Bind material mapping types
  class_<TextureMap>("TextureMap")
      .constructor()
      .function("get", &TextureMap::get)
      .function("set", &TextureMap::set);
  class_<OcclusionMap>("OcclusionMap")
      .constructor()
      .function("get", &OcclusionMap::get)
      .function("set", &OcclusionMap::set);

  // Bind occlusion mask. It is intentionally opaque to
  // TypeScript because it is quite inefficient to query its values one
  // at a time from TypeScript.
  class_<OcclusionMask>("OcclusionMask");
  function("to_occlusion_mask", &to_occlusion_mask_js);

  // Bind mesh types
  class_<BiomesMeshJs>("BiomesMesh")
      .function("indicesView", &BiomesMeshJs::indices_view)
      .function("verticesView", &BiomesMeshJs::vertices_view)
      .function("empty", &BiomesMeshJs::empty)
      .function("stride", &BiomesMeshJs::stride);
  class_<CompactMeshJs>("CompactMesh")
      .function("origin", &CompactMeshJs::origin)
      .function("indicesView", &CompactMeshJs::indices_view)
      .function("verticesView", &CompactMeshJs::vertices_view)
      .function("empty", &CompactMeshJs::empty)
      .function("stride", &CompactMeshJs::stride);
  class_<GroupedMeshJs>("GroupedMesh")
      .function("groupView", &GroupedMeshJs::group_view)
      .function("indicesView", &GroupedMeshJs::indices_view)
      .function("verticesView", &GroupedMeshJs::vertices_view)
      .function("materialsView", &GroupedMeshJs::materials_view)
      .function("directionsView", &GroupedMeshJs::directions_view)
      .function("empty", &GroupedMeshJs::empty)
      .function("stride", &GroupedMeshJs::stride)
      .function("groups", &GroupedMeshJs::groups)
      .function("counts", &GroupedMeshJs::counts)
      .function("starts", &GroupedMeshJs::starts);

  // Bind lighting routines.
  class_<LightMapJs>("LightMap")
      .function("data", &LightMapJs::data)
      .function("shape", &LightMapJs::shape);
  class_<AmbientOcclusionMapJs>("AmbientOcclusionMap")
      .constructor()
      .function("set", &AmbientOcclusionMapJs::set)
      .function("get", &AmbientOcclusionMapJs::get);
  function("compute_light_map", &compute_light_map_js);

  // Sync occlusion routines.
  function("traverse_mask", &traverse_mask_js);

  // Bind mesh generation routines.
  function("thread_test", &thread_test);
  function("to_mesh", &to_mesh_js);
  function("sparse_map_to_mesh", &sparse_map_to_mesh_js);
  function("volume_map_to_mesh", &volume_map_to_mesh_js);
  function("to_compact_mesh", &to_compact_mesh_js);
  function("group_mesh", &group_mesh_js);
  function("sparse_map_to_grouped_mesh", &sparse_map_to_grouped_mesh_js);
  function("volume_map_to_grouped_mesh", &volume_map_to_grouped_mesh_js);

  // Axis-aligned bounding box type.
  value_array<AABB>("AABB").element(&AABB::v0).element(&AABB::v1);

  // Bind mesh type
  class_<BoxBlockJs>("BoxBlock")
      .function("scan", &BoxBlockJs::scan)
      .function("intersect", &BoxBlockJs::intersect);

  // AABB intersection testing routine.
  function("to_boxes", &to_boxes_js);
  function("intersect_ray_aabb", &intersect_ray_aabb_js);

  // Makes a bag of values in a block
  function(
      "sparseMapValueCountsU32",
      &value_counts_js<SparseMapJs<uint32_t>, uint32_t>);
  function(
      "volumeMapValueCountsU32",
      &value_counts_js<VolumeMapJs<uint32_t>, uint32_t>);
  function(
      "volumeBlockValueCountsU32",
      &value_counts_js<VolumeBlockJs<uint32_t>, uint32_t>);

  // Densifying volume blocks
  function(
      "volumeBlockToDenseArrayU32", &volume_block_to_dense_array_js<uint32_t>);

  function("get_total_memory", &js::memory::get_total_memory);
  function("get_used_memory", &js::memory::get_used_memory);
  function("do_leak_check", &js::memory::do_leak_check);
}

}  // namespace voxeloo::biomes::js

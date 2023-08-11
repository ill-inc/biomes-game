#pragma once

#include <array>
#include <limits>
#include <type_traits>
#include <vector>

#include "cereal/archives/binary.hpp"
#include "cereal/types/tuple.hpp"
#include "cereal/types/vector.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/quadifier.hpp"

namespace voxeloo::meshes {

// Define mesh types.
struct Vertex {
  Vec3f xyz;
  Vec3f rgb;
};

inline bool operator==(const Vertex& u, const Vertex& v) {
  return u.xyz == v.xyz && u.rgb == v.rgb;
}

struct Mesh {
  std::vector<Vertex> vertices;
  std::vector<uint32_t> indices;
};

// Interface for generating meshes from a source geometry representation.
template <typename Source, typename Emitter>
class MeshMaker {
 public:
  void emit(Emitter& emitter) const;
};

// Geometry emitter that simply counts the number of vertices and indices.
class CountEmitter {
 public:
  CountEmitter() : vertex_count_(0), index_count_(0) {}

  size_t vertex_count() const {
    return vertex_count_;
  }

  size_t index_count() const {
    return index_count_;
  }

  void emit_vertex(ATTR_UNUSED Vec3f xyz, ATTR_UNUSED Vec3f rgb) {
    vertex_count_ += 1;
  }

  void emit_index(ATTR_UNUSED uint32_t index) {
    index_count_ += 1;
  }

 private:
  size_t vertex_count_;
  size_t index_count_;
};

// Geometry emitter that outputs to a mesh.
class MeshEmitter {
 public:
  Mesh& mesh() {
    return mesh_;
  }

  size_t vertex_count() const {
    return mesh_.vertices.size();
  }

  size_t index_count() const {
    return mesh_.indices.size();
  }

  void emit_vertex(Vec3f xyz, Vec3f rgb) {
    mesh_.vertices.emplace_back(Vertex{xyz, rgb});
  }

  void emit_index(uint32_t index) {
    mesh_.indices.emplace_back(index);
  }

 private:
  Mesh mesh_;
};

// Geometry emitter that outputs to STL vectors.
template <typename V, typename I>
class VectorEmitter {
 public:
  std::vector<V>& vertices() {
    return v_;
  }

  std::vector<I>& indices() {
    return i_;
  }

  void swap(std::vector<V>& v, std::vector<I>& i) {
    v_.swap(v);
    i_.swap(i);
  }

  size_t vertex_count() const {
    return v_.size();
  }

  size_t index_count() const {
    return i_.size();
  }

  void emit_vertex(Vec3f xyz, Vec3f rgb) {
    auto [x, y, z] = xyz;
    auto [r, g, b] = rgb;
    v_.emplace_back(V{{x, y, z}, {r, g, b}});
  }

  void emit_index(uint32_t index) {
    static const auto kMaxIndex = std::numeric_limits<I>::max();
    CHECK_ARGUMENT(index <= static_cast<int>(kMaxIndex));
    i_.emplace_back(static_cast<I>(index));
  }

 private:
  std::vector<V> v_;
  std::vector<I> i_;
};

template <typename Emitter, typename Src, typename... Args>
inline void emit(Emitter& emitter, Src&& src, Args&&... args) {
  using Maker = MeshMaker<std::decay_t<Src>, Emitter>;
  Maker(std::forward<Src>(src)).emit(emitter, std::forward<Args>(args)...);
}

template <typename... Args>
inline void emit_counts(
    size_t& vertex_count, size_t& index_count, Args&&... args) {
  CountEmitter emitter;
  emit<CountEmitter, Args...>(emitter, std::forward<Args>(args)...);
  vertex_count += emitter.vertex_count();
  index_count += emitter.index_count();
}

template <typename V, typename I, typename... Args>
inline void emit_vectors(
    std::vector<V>& vertices, std::vector<I>& indices, Args&&... args) {
  VectorEmitter<V, I> emitter;
  emitter.swap(vertices, indices);
  emit<VectorEmitter<V, I>, Args...>(emitter, std::forward<Args>(args)...);
  emitter.swap(vertices, indices);
}

template <typename... Args>
inline Mesh emit_mesh(Args&&... args) {
  MeshEmitter emitter;
  emit<MeshEmitter, Args...>(emitter, std::forward<Args>(args)...);
  return std::move(emitter.mesh());
}

// Enum defining the encoding format of the block list.
enum MeshFormat { DEFAULT_FORMAT = 0 };

// Encodes a mesh to the given archive.
template <typename Archive>
inline void save(Archive& ar, const Mesh& mesh) {
  ar(DEFAULT_FORMAT);

  // Encode the vertices.
  ar(mesh.vertices.size());
  for (const auto& v : mesh.vertices) {
    auto [x, y, z] = v.xyz;
    auto [r, g, b] = v.rgb;
    ar(x, y, z, r, g, b);
  }

  // Encode the triangle indices.
  ar(mesh.indices);
}

// Decodes a mesh from the given archive.
template <typename Archive>
inline void load(Archive& ar, Mesh& mesh) {
  MeshFormat format;
  ar(format);
  CHECK_ARGUMENT(format == DEFAULT_FORMAT);

  // Decode the vertices.
  size_t n;
  ar(n);
  mesh.vertices.reserve(n);
  for (size_t i = 0; i < n; i += 1) {
    float x, y, z, r, g, b;
    ar(x, y, z, r, g, b);
    mesh.vertices.emplace_back(Vertex{
        {x, y, z},
        {r, g, b},
    });
  }

  // Decode the triangle indices.
  ar(mesh.indices);
}

}  // namespace voxeloo::meshes

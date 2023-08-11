#pragma once

#include <cereal/types/array.hpp>
#include <cereal/types/vector.hpp>
#include <cmath>
#include <vector>

#include "voxeloo/biomes/culling.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/galois/blocks.hpp"
#include "voxeloo/galois/collision.hpp"
#include "voxeloo/galois/conv.hpp"
#include "voxeloo/galois/glass.hpp"
#include "voxeloo/galois/utils.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo {
template <typename Archive, typename T>
inline auto save(Archive& ar, const Vec3<T>& v) {
  ar(v.x, v.y, v.z);
}
template <typename Archive, typename T>
inline auto load(Archive& ar, Vec3<T>& v) {
  ar(v.x, v.y, v.z);
}
}  // namespace voxeloo

namespace voxeloo::galois::shapes {

using ShapeId = uint32_t;
using IsomorphismId = uint32_t;

inline auto to_isomorphism_id(uint32_t shape_id, uint32_t transform_id) {
  return static_cast<uint32_t>((shape_id << 6) | (transform_id & 0x3f));
}

inline auto to_shape_id(uint32_t isomorphism_id) {
  return static_cast<uint32_t>(isomorphism_id >> 6);
}

static constexpr int kMicroScale = 8;
static constexpr float kInvMicroScale = 1.0f / static_cast<float>(kMicroScale);

enum Level {
  MACRO = 0,
  MICRO = 1,
};

struct Quad {
  Vec3i pos;
  Level lvl;
};

struct Quads {
  std::array<std::vector<Quad>, voxels::kDirCount> dir;
};

struct Box {
  Vec3i pos;
  int len;
};

struct Edge {
  Vec3i v0;
  Vec3i v1;
};

using Boxes = std::vector<Box>;
using IsomorphismMask = std::array<bool, 8 * 8 * 8>;

inline bool subvoxel_exists(IsomorphismMask mask, int x, int y, int z) {
  return mask[z * 64 + y * 8 + x];
}

struct WireframeMesh {
  std::vector<Vec3f> vertices;
  std::vector<uint32_t> indices;

  auto vertices_view() const {
    return reinterpret_cast<const uint8_t*>(&vertices[0]);
  }

  auto indices_view() const {
    return reinterpret_cast<const uint8_t*>(&indices[0]);
  }

  auto vertices_bytes() const {
    return sizeof(Vec3f) * vertices.size();
  }

  auto indices_bytes() const {
    return sizeof(uint32_t) * indices.size();
  }

  auto stride() const {
    return sizeof(Vec3f) / sizeof(float);
  }
};

class WireframeMeshBuilder {
 public:
  // Fixes up the indices local to the given vertices to work
  // with our existing index
  template <typename InVertex, typename Fn>
  auto& add_transformed_triangles(
      const std::vector<InVertex>& vertices,
      const std::vector<uint32_t>& indices,
      Fn&& vertex_transform) {
    size_t offset = out_.vertices.size();
    out_.vertices.reserve(offset + vertices.size());
    std::transform(
        vertices.begin(),
        vertices.end(),
        std::back_inserter(out_.vertices),
        vertex_transform);

    out_.indices.reserve(out_.indices.size() + indices.size());
    for (auto i : indices) {
      out_.indices.push_back(i + offset);
    }

    return *this;
  }

  // For bindings
  auto& add_triangles(
      const std::vector<std::array<float, 3>>& vertices,
      const std::vector<uint32_t>& indices) {
    return add_transformed_triangles(vertices, indices, [](auto floatArray) {
      return Vec3f(floatArray);
    });
  }

  auto build() {
    return out_;
  }

 private:
  WireframeMesh out_;
};

class QuadsBuilder {
 public:
  auto& add(
      const std::vector<std::array<int, 3>>& positions,
      voxels::Dir dir,
      Level lvl) {
    auto& quads = out_.dir[static_cast<size_t>(dir)];
    for (const auto& pos : positions) {
      quads.push_back({pos, lvl});
    }
    return *this;
  }

  auto build() {
    return out_;
  }

 private:
  Quads out_;
};

class BoxesBuilder {
 public:
  auto& add(const std::array<int, 3>& pos, int len) {
    out_.push_back({pos, len});
    return *this;
  }

  auto build() {
    return out_;
  }

 private:
  Boxes out_;
};

struct Index {
  std::vector<uint32_t> offsets;
  std::vector<Quads> quads;
  std::vector<Boxes> boxes;
  std::vector<WireframeMesh> wireframe_meshes;
  std::vector<IsomorphismMask> isomorphism_masks;
  std::vector<uint8_t> occlusion_masks;

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(*this));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(*this, transport::from_base64(blob));
  }
};

class IndexBuilder {
 public:
  explicit IndexBuilder(uint32_t max_id) {
    auto size = to_isomorphism_id(max_id + 1, 0);
    out_.offsets.resize(size, size);
  }

  void set_offset(IsomorphismId id, uint32_t offset) {
    CHECK_ARGUMENT(id < out_.offsets.size());
    out_.offsets[id] = offset;
  }

  size_t add_isomorphism(
      Quads quads,
      Boxes boxes,
      WireframeMesh wireframe_mesh,
      uint8_t occlusion_mask,
      IsomorphismMask isomorphism_mask) {
    auto offset = out_.quads.size();
    out_.quads.push_back(std::move(quads));
    out_.boxes.push_back(std::move(boxes));
    out_.wireframe_meshes.push_back(std::move(wireframe_mesh));
    out_.occlusion_masks.push_back(std::move(occlusion_mask));
    out_.isomorphism_masks.push_back(std::move(isomorphism_mask));
    return offset;
  }

  auto build() {
    return out_;
  }

 private:
  Index out_;
  std::vector<uint32_t> offsets_;
};

template <typename Archive>
inline auto save(Archive& ar, const Quad& quad) {
  ar(quad.pos.x, quad.pos.y, quad.pos.z, quad.lvl);
}

template <typename Archive>
inline auto load(Archive& ar, Quad& quad) {
  ar(quad.pos.x, quad.pos.y, quad.pos.z, quad.lvl);
}

template <typename Archive>
inline auto save(Archive& ar, const Quads& quads) {
  ar(quads.dir);
}

template <typename Archive>
inline auto load(Archive& ar, Quads& quads) {
  ar(quads.dir);
}

template <typename Archive>
inline auto save(Archive& ar, const Box& box) {
  ar(box.pos.x, box.pos.y, box.pos.z, box.len);
}

template <typename Archive>
inline auto load(Archive& ar, Box& box) {
  ar(box.pos.x, box.pos.y, box.pos.z, box.len);
}

template <typename Archive>
inline auto save(Archive& ar, const Edge& edge) {
  ar(edge.v0.x, edge.v0.y, edge.v0.z);
  ar(edge.v1.x, edge.v1.y, edge.v1.z);
}

template <typename Archive>
inline auto load(Archive& ar, Edge& edge) {
  ar(edge.v0.x, edge.v0.y, edge.v0.z);
  ar(edge.v1.x, edge.v1.y, edge.v1.z);
}

template <typename Archive>
inline auto save(Archive& ar, const WireframeMesh& mesh) {
  ar(mesh.vertices);
  ar(mesh.indices);
}

template <typename Archive>
inline auto load(Archive& ar, WireframeMesh& mesh) {
  ar(mesh.vertices);
  ar(mesh.indices);
}

template <typename Archive>
inline auto save(Archive& ar, const Index& index) {
  ar(index.offsets);
  ar(index.quads);
  ar(index.boxes);
  ar(index.wireframe_meshes);
  ar(index.occlusion_masks);
  ar(index.isomorphism_masks);
}

template <typename Archive>
inline auto load(Archive& ar, Index& index) {
  ar(index.offsets);
  ar(index.quads);
  ar(index.boxes);
  ar(index.wireframe_meshes);
  ar(index.occlusion_masks);
  ar(index.isomorphism_masks);
}

using Mask = tensors::Tensor<bool>;
using Tensor = tensors::Tensor<IsomorphismId>;
using OcclusionTensor = tensors::Tensor<uint8_t>;

inline auto to_tensor(const blocks::Tensor& tensor, IsomorphismId isomorphism) {
  return tensors::map_values(tensor, [&](auto id) {
    return id ? isomorphism : 0;
  });
}

template <typename SampleFn>
inline auto to_occlusion_tensor(const OcclusionTensor& tensor, SampleFn&& fn) {
  auto block = conv::to_block(tensor, std::forward<SampleFn>(fn));
  return tensors::map_dense(tensor, [&](auto pos, ATTR_UNUSED auto val) {
    auto i_pos = to<int>(pos);
    auto x_neg = (block.get(i_pos - vec3(1, 0, 0)) & 0b10) >> 1;
    auto x_pos = (block.get(i_pos + vec3(1, 0, 0)) & 0b1) << 1;
    auto y_neg = (block.get(i_pos - vec3(0, 1, 0)) & 0b1000) >> 1;
    auto y_pos = (block.get(i_pos + vec3(0, 1, 0)) & 0b100) << 1;
    auto z_neg = (block.get(i_pos - vec3(0, 0, 1)) & 0b100000) >> 1;
    auto z_pos = (block.get(i_pos + vec3(0, 0, 1)) & 0b10000) << 1;
    return static_cast<uint8_t>(x_neg | x_pos | y_neg | y_pos | z_neg | z_pos);
  });
}

inline auto to_occlusion_tensor(const Tensor& tensor, const Index& index) {
  // Extract the tensors self-occlusion values.
  auto masks = tensors::map_values(tensor, [&](auto id) {
    return index.occlusion_masks.at(index.offsets.at(id));
  });

  return to_occlusion_tensor(masks, [&](Vec3i pos) {
    if (voxels::box_contains(voxels::cube_box(tensors::kChunkDim), pos)) {
      auto isomorphism_id = tensor.get(to<uint32_t>(pos));
      return index.occlusion_masks.at(index.offsets.at(isomorphism_id));
    }
    return static_cast<uint8_t>(0);
  });
}

inline auto pack_glass_key(
    uint8_t shape_mask, glass::GlassId id, blocks::Dye dye) {
  return (((id << 8) | dye) << 6) | shape_mask;
}

template <typename SampleFn>
inline auto to_glass_occlusion_tensor(
    const tensors::Tensor<uint32_t>& tensor, SampleFn&& fn) {
  // We only allow faces to be merged if the glass type and dye are the same
  auto get = [](uint32_t x, uint32_t y) -> uint8_t {
    return (x >> 6 == y >> 6) ? y : uint8_t{};
  };

  auto block = conv::to_block(tensor, std::forward<SampleFn>(fn));
  return tensors::map_dense(tensor, [&](auto pos, auto val) {
    auto i_pos = to<int>(pos);
    auto x_neg = (get(val, block.get(i_pos - vec3(1, 0, 0))) & 0b10) >> 1;
    auto x_pos = (get(val, block.get(i_pos + vec3(1, 0, 0))) & 0b1) << 1;
    auto y_neg = (get(val, block.get(i_pos - vec3(0, 1, 0))) & 0b1000) >> 1;
    auto y_pos = (get(val, block.get(i_pos + vec3(0, 1, 0))) & 0b100) << 1;
    auto z_neg = (get(val, block.get(i_pos - vec3(0, 0, 1))) & 0b100000) >> 1;
    auto z_pos = (get(val, block.get(i_pos + vec3(0, 0, 1))) & 0b10000) << 1;
    return static_cast<uint8_t>(x_neg | x_pos | y_neg | y_pos | z_neg | z_pos);
  });
}

inline auto to_glass_occlusion_tensor(
    const Tensor& shape_tensor,
    const glass::Tensor& glass_tensor,
    const blocks::DyeTensor& dye_tensor,
    const Index& index) {
  // Extract the tensors self-occlusion values.
  auto tensor = tensors::map_sparse(shape_tensor, [&](auto pos, auto id) {
    return pack_glass_key(
        index.occlusion_masks.at(index.offsets.at(id)),
        glass_tensor.get(pos),
        dye_tensor.get(pos));
  });

  return to_glass_occlusion_tensor(tensor, [&](Vec3i pos) {
    return 0u;
  });
}

// TODO(taylor): Replace with compact vertex.
struct QuadVertex {
  Vec3f pos;
  Vec2f uv;
  float dir;
};

struct GeometryBuffer {
  std::vector<QuadVertex> vertices;
  std::vector<uint32_t> indices;

  auto vertices_view() const {
    return reinterpret_cast<const uint8_t*>(&vertices[0]);
  }

  auto indices_view() const {
    return reinterpret_cast<const uint8_t*>(&indices[0]);
  }

  auto vertices_bytes() const {
    return sizeof(QuadVertex) * vertices.size();
  }

  auto indices_bytes() const {
    return sizeof(uint32_t) * indices.size();
  }

  auto stride() const {
    return sizeof(QuadVertex) / sizeof(float);
  }
};

struct Cell {
  Level key;
  voxels::Dir dir;
  int lvl;
};

inline bool operator==(const Cell& a, const Cell& b) {
  return a.key == b.key && a.dir == b.dir && a.lvl == b.lvl;
}

struct CellHash {
  size_t operator()(const Cell& cell) const {
    auto x = static_cast<uint32_t>(cell.key);
    auto y = static_cast<uint32_t>(cell.dir);
    auto z = static_cast<uint32_t>(cell.lvl);
    return spatial::combine(x, y, z);
  }
};

template <typename EmitFn>
inline auto emit_quads(
    const Tensor& tensor,
    const OcclusionTensor& occlusions,
    const Index& index,
    EmitFn&& emit_fn) {
  tensors::scan_sparse(tensor, [&](auto pos, auto id) {
    const auto& quads = index.quads.at(index.offsets.at(id));
    for (auto dir = 0; dir < voxels::kDirCount; dir += 1) {
      // TODO(taylor): Implement proper culling here:
      // 1. Categorize faces by whether they're on the boundary or not.
      // 2. Cull boundary faces if the direction is occluded.
      auto mask = occlusions.get(pos);
      if (id < to_isomorphism_id(2, 0) && (mask & (1 << dir))) {
        continue;  // Cull direction.
      }

      for (const auto& quad : quads.dir.at(dir)) {
        emit_fn(pos, static_cast<voxels::Dir>(dir), quad);
      }
    }
  });
}

inline auto to_geometry_buffer(
    const Tensor& tensor,
    const OcclusionTensor& occlusion,
    const Index& index) {
  // TODO(taylor): Use more efficient quadifier to skip the hashing / sorting.
  quadifier::Quadifier<Cell, CellHash> quadifier;
  emit_quads(tensor, occlusion, index, [&](auto pos, auto dir, auto quad) {
    auto scale = quad.lvl == Level::MICRO ? kMicroScale : 1;
    const auto& [x, y, z] = scale * to<int>(pos) + quad.pos;
    switch (dir) {
      case voxels::X_NEG:
        quadifier.add({quad.lvl, voxels::X_NEG, x}, {z, y});
        break;
      case voxels::X_POS:
        quadifier.add({quad.lvl, voxels::X_POS, x + 1}, {z, y});
        break;
      case voxels::Y_NEG:
        quadifier.add({quad.lvl, voxels::Y_NEG, y}, {x, z});
        break;
      case voxels::Y_POS:
        quadifier.add({quad.lvl, voxels::Y_POS, y + 1}, {x, z});
        break;
      case voxels::Z_NEG:
        quadifier.add({quad.lvl, voxels::Z_NEG, z}, {x, y});
        break;
      case voxels::Z_POS:
        quadifier.add({quad.lvl, voxels::Z_POS, z + 1}, {x, y});
        break;
    }
  });

  GeometryBuffer ret;
  uint32_t index_offset = 0;
  for (const auto& [cell, quad] : quadifier.build()) {
    auto dir = static_cast<float>(cell.dir);
    auto scale = 1.0f / static_cast<float>(cell.key == MICRO ? kMicroScale : 1);
    auto emit_vertex = [&](int x, int y, int z, int u, int v) {
      auto pos = scale * vec3(x, y, z).to<float>();
      auto uv = vec2(u, v).to<float>();
      ret.vertices.push_back({pos, uv, dir});
    };

    switch (cell.dir) {
      case voxels::X_NEG:
        emit_vertex(cell.lvl, quad.v0.y, quad.v0.x, 0, 0);
        emit_vertex(cell.lvl, quad.v0.y, quad.v1.x, 1, 0);
        emit_vertex(cell.lvl, quad.v1.y, quad.v1.x, 1, 1);
        emit_vertex(cell.lvl, quad.v1.y, quad.v0.x, 0, 1);
        break;
      case voxels::X_POS:
        emit_vertex(cell.lvl, quad.v0.y, quad.v1.x, 0, 0);
        emit_vertex(cell.lvl, quad.v0.y, quad.v0.x, 1, 0);
        emit_vertex(cell.lvl, quad.v1.y, quad.v0.x, 1, 1);
        emit_vertex(cell.lvl, quad.v1.y, quad.v1.x, 0, 1);
        break;
      case voxels::Y_NEG:
        emit_vertex(quad.v0.x, cell.lvl, quad.v0.y, 0, 0);
        emit_vertex(quad.v1.x, cell.lvl, quad.v0.y, 1, 0);
        emit_vertex(quad.v1.x, cell.lvl, quad.v1.y, 1, 1);
        emit_vertex(quad.v0.x, cell.lvl, quad.v1.y, 0, 1);
        break;
      case voxels::Y_POS:
        emit_vertex(quad.v1.x, cell.lvl, quad.v0.y, 0, 0);
        emit_vertex(quad.v0.x, cell.lvl, quad.v0.y, 1, 0);
        emit_vertex(quad.v0.x, cell.lvl, quad.v1.y, 1, 1);
        emit_vertex(quad.v1.x, cell.lvl, quad.v1.y, 0, 1);
        break;
      case voxels::Z_NEG:
        emit_vertex(quad.v1.x, quad.v0.y, cell.lvl, 0, 0);
        emit_vertex(quad.v0.x, quad.v0.y, cell.lvl, 1, 0);
        emit_vertex(quad.v0.x, quad.v1.y, cell.lvl, 1, 1);
        emit_vertex(quad.v1.x, quad.v1.y, cell.lvl, 0, 1);
        break;
      case voxels::Z_POS:
        emit_vertex(quad.v0.x, quad.v0.y, cell.lvl, 0, 0);
        emit_vertex(quad.v1.x, quad.v0.y, cell.lvl, 1, 0);
        emit_vertex(quad.v1.x, quad.v1.y, cell.lvl, 1, 1);
        emit_vertex(quad.v0.x, quad.v1.y, cell.lvl, 0, 1);
        break;
    }

    for (const auto i : voxels::face_indices()) {
      ret.indices.emplace_back(index_offset + i);
    }

    index_offset += 4;
  }

  return ret;
}

inline auto to_box_list(
    const Index& index, const Tensor& tensor, Vec3d origin) {
  // Generate the initial box list from the solid voxels.
  auto ret = collision::to_box_list(
      tensors::map_values(
          tensor,
          [](auto id) {
            return to_shape_id(id) == 1;  // The full block
          }),
      origin);

  // Generate boxes over each block that is neither empty nor full.
  {
    std::vector<boxifier::Run> runs;
    tensors::scan_sparse(
        tensors::map_values(
            tensor,
            [&](auto id) {
              return to_shape_id(id) > 1 ? index.offsets.at(id) : 0;
            }),
        [&](auto pos, auto offset) {
          for (const auto& box : index.boxes.at(offset)) {
            runs.push_back({kMicroScale * to<int>(pos) + box.pos, box.len});
          }
        });

    sort_by(runs, [&](const auto& run) {
      auto w = kMicroScale * tensor.shape[0];
      auto h = kMicroScale * tensor.shape[1];
      return run.start.x + w * (run.start.y + h * run.start.z);
    });

    boxifier::Boxifier boxifier;
    for (auto& run : runs) {
      boxifier.push(std::move(run));
    }

    auto scale = 1.0 / static_cast<double>(kMicroScale);
    boxifier.emit([&](auto box) {
      auto [v0, v1] = box;
      ret.push_back({
          origin + scale * to<double>(v0),
          origin + scale * to<double>(v1),
      });
    });
  }

  return ret;
}

inline auto to_occluder(
    const Index& index, const Tensor& tensor, Vec3d origin) {
  return culling::to_occluder(
      tensors::map_values(
          tensor,
          [](auto id) {
            return to_shape_id(id) == 1;  // The full block
          }),
      origin);
}

static constexpr int kMaxSubvoxelMarchLength = 4 * 8;

// Computes the face of a ray intersection, for subvoxel geometry.
inline auto subvoxel_ray_intersection(
    const shapes::Index& shape_index,
    const uint32_t isomorphism_id,
    const Vec3f& ray_origin,
    const Vec3f& ray_direction) {
  uint32_t offset = shape_index.offsets.at(isomorphism_id);
  auto isomorphism_mask = shape_index.isomorphism_masks[offset];

  std::optional<voxels::Dir> hit;
  auto scale = static_cast<float>(kMicroScale);
  // Shift back slightly so hits on the outer-most subvoxels are detected.
  auto ray_origin_subvoxel_coords = scale * ray_origin - 0.1f * ray_direction;
  // Check if the ray has entered a voxel. Only stop marching when
  // there is a hit, or the ray has past through a voxel.
  auto before = true;
  voxels::march_faces(
      ray_origin_subvoxel_coords,
      ray_direction,
      [&](auto x, auto y, auto z, auto distance, auto face) {
        if (voxels::box_contains(voxels::cube_box(8), {x, y, z})) {
          before = false;
          if (subvoxel_exists(isomorphism_mask, x, y, z)) {
            hit = face;
          }
          // Stop marching if there is a hit.
          return !hit;
        }
        if (distance > kMaxSubvoxelMarchLength) {
          return false;
        }
        return before;
      });

  return hit;
}

}  // namespace voxeloo::galois::shapes

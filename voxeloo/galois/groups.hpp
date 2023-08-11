#pragma once

#include <cereal/types/tuple.hpp>
#include <cereal/types/unordered_map.hpp>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/galois/blocks.hpp"
#include "voxeloo/galois/csg.hpp"
#include "voxeloo/galois/florae.hpp"
#include "voxeloo/galois/glass.hpp"
#include "voxeloo/galois/muck.hpp"
#include "voxeloo/galois/shapes.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::groups {

struct Vertex {
  Vec3f pos;
  Vec3f normal;
  Vec2f uv;
};

using RGBA = std::array<uint8_t, 4>;

struct Texture {
  Vec2u shape;
  std::vector<RGBA> data;

  auto ptr() const {
    return reinterpret_cast<const uint8_t*>(&data[0]);
  }

  auto bytes() const {
    return sizeof(RGBA) * data.size();
  }
};

struct Mesh {
  std::vector<Vertex> vertices;
  std::vector<uint32_t> indices;
  Texture texture;

  auto vertices_view() const {
    return reinterpret_cast<const uint8_t*>(&vertices[0]);
  }

  auto indices_view() const {
    return reinterpret_cast<const uint8_t*>(&indices[0]);
  }

  auto vertices_bytes() const {
    return sizeof(Vertex) * vertices.size();
  }

  auto indices_bytes() const {
    return sizeof(uint32_t) * indices.size();
  }

  auto stride() const {
    return sizeof(Vertex) / sizeof(float);
  }
};

struct CombinedMesh {
  Mesh blocks;
  Mesh florae;
  Mesh glass;
};

struct Index {
  blocks::Index blocks;
  shapes::Index shapes;
  florae::Index florae;
  glass::Index glass;
  std::vector<Texture> textures;
  std::vector<uint32_t> block_offsets;
  std::vector<uint32_t> flora_offsets;
  std::vector<uint32_t> glass_offsets;

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(*this));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(*this, transport::from_base64(blob));
  }
};

inline auto to_index(
    blocks::Index blocks,
    shapes::Index shapes,
    florae::Index florae,
    blocks::Index glasses,
    std::vector<Texture> textures,
    std::vector<uint32_t> block_offsets,
    std::vector<uint32_t> flora_offsets,
    std::vector<uint32_t> glass_offsets) {
  // Require that all block and flora textures have the same shape.
  for (auto offset : block_offsets) {
    CHECK_ARGUMENT(textures[block_offsets[0]].shape == textures[offset].shape);
  }
  for (auto offset : flora_offsets) {
    CHECK_ARGUMENT(textures[flora_offsets[0]].shape == textures[offset].shape);
  }
  for (auto offset : glass_offsets) {
    CHECK_ARGUMENT(textures[glass_offsets[0]].shape == textures[offset].shape);
  }

  return Index{
      std::move(blocks),
      std::move(shapes),
      std::move(florae),
      std::move(glasses),
      std::move(textures),
      std::move(block_offsets),
      std::move(flora_offsets),
      std::move(glass_offsets),
  };
}

template <typename Archive>
inline auto save(Archive& ar, const Texture& texture) {
  ar(texture.shape.x, texture.shape.y);
  ar(texture.data);
}

template <typename Archive>
inline auto load(Archive& ar, Texture& texture) {
  ar(texture.shape.x, texture.shape.y);
  ar(texture.data);
}

template <typename Archive>
inline auto save(Archive& ar, const Index& index) {
  ar(index.blocks);
  ar(index.shapes);
  ar(index.florae);
  ar(index.glass);
  ar(index.textures);
  ar(index.block_offsets);
  ar(index.flora_offsets);
  ar(index.glass_offsets);
}

template <typename Archive>
inline auto load(Archive& ar, Index& index) {
  ar(index.blocks);
  ar(index.shapes);
  ar(index.florae);
  ar(index.glass);
  ar(index.textures);
  ar(index.block_offsets);
  ar(index.flora_offsets);
  ar(index.glass_offsets);
}

using blocks::BlockId;
using florae::FloraId;
using glass::GlassId;
using shapes::IsomorphismId;

enum EntryKind {
  EMPTY = 0,
  BLOCK = 1,
  FLORA = 2,
  GLASS = 3,
};

struct BlockEntry {
  BlockId block_id;
  IsomorphismId isomorphism_id;
  blocks::Dye dye;
  blocks::Moisture moisture;
};

struct FloraEntry {
  FloraId flora_id;
  florae::Growth growth;
};

struct GlassEntry {
  GlassId glass_id;
  IsomorphismId isomorphism_id;
  blocks::Dye dye;
  blocks::Moisture moisture;
};

struct Entry {
  EntryKind kind;
  union {
    BlockEntry block;
    FloraEntry flora;
    GlassEntry glass;
  };
};

inline auto make_block_entry(
    BlockId block,
    IsomorphismId isomorphism,
    blocks::Dye dye,
    blocks::Moisture moisture) {
  return Entry{
      .kind = EntryKind::BLOCK,
      .block = {
          .block_id = block,
          .isomorphism_id = isomorphism,
          .dye = dye,
          .moisture = moisture}};
}

inline auto make_flora_entry(FloraId flora, florae::Growth growth) {
  return Entry{
      .kind = EntryKind::FLORA,
      .flora = {
          .flora_id = flora,
          .growth = growth,
      }};
}

inline auto make_glass_entry(
    GlassId glass,
    IsomorphismId isomorphism,
    blocks::Dye dye,
    blocks::Moisture moisture) {
  return Entry{
      .kind = EntryKind::GLASS,
      .glass = {
          .glass_id = glass,
          .isomorphism_id = isomorphism,
          .dye = dye,
          .moisture = moisture}};
}

struct Tensor {
  blocks::Tensor blocks;
  florae::Tensor florae;
  glass::Tensor glasses;
  shapes::Tensor isomorphisms;
  blocks::DyeTensor dyes;
  blocks::MoistureTensor moistures;
  florae::GrowthTensor growths;

  auto get(Vec3u pos) const {
    if (auto block = blocks.get(pos); block) {
      return make_block_entry(
          block, isomorphisms.get(pos), dyes.get(pos), moistures.get(pos));
    } else if (auto flora = florae.get(pos); flora) {
      return make_flora_entry(flora, growths.get(pos));
    } else if (auto glass = glasses.get(pos); glass) {
      return make_glass_entry(
          glass, isomorphisms.get(pos), dyes.get(pos), moistures.get(pos));
    } else {
      return Entry{EntryKind::EMPTY};
    }
  }

  template <typename Fn>
  auto scan(Fn&& fn) const {
    tensors::scan_sparse(blocks, [&](auto pos, auto _) {
      fn(pos, get(pos));
    });
    tensors::scan_sparse(florae, [&](auto pos, auto val) {
      fn(pos, get(pos));
    });
    tensors::scan_sparse(glasses, [&](auto pos, auto val) {
      fn(pos, get(pos));
    });
  }

  auto save() const {
    return transport::to_base64(transport::to_compressed_blob(*this));
  }

  void load(const std::string& blob) {
    transport::from_compressed_blob(*this, transport::from_base64(blob));
  }
};

class TensorBuilder {
 public:
  auto key(Vec3u pos) const {
    return tensors::encode_tensor_pos32(pos);
  }

  void set(Vec3u pos, Entry entry) {
    extent_ = max(extent_, pos);
    entries_[key(pos)] = entry;
  }

  void set_block(
      Vec3u pos,
      BlockId block,
      IsomorphismId isomorphism,
      blocks::Dye dye,
      blocks::Moisture moisture) {
    set(pos, make_block_entry(block, isomorphism, dye, moisture));
  }

  void set_flora(Vec3u pos, FloraId flora, florae::Growth growth) {
    set(pos, make_flora_entry(flora, growth));
  }

  void set_glass(
      Vec3u pos,
      GlassId glass,
      IsomorphismId isomorphism,
      blocks::Dye dye,
      blocks::Moisture moisture) {
    set(pos, make_glass_entry(glass, isomorphism, dye, moisture));
  }

  void del(Vec3u pos) {
    entries_.erase(key(pos));
  }

  auto get(Vec3u pos) {
    if (auto entry = entries_.find(key(pos)); entry != entries_.end()) {
      return entry->second;
    }
    return Entry{EntryKind::EMPTY};
  }

  auto build() {
    Vec3u shape = extent_ + Vec3u{1u, 1u, 1u};
    tensors::SparseTensorBuilder<BlockId> blocks{shape};
    tensors::SparseTensorBuilder<FloraId> florae{shape};
    tensors::SparseTensorBuilder<GlassId> glasses{shape};
    tensors::SparseTensorBuilder<IsomorphismId> isomorphisms{shape};
    tensors::SparseTensorBuilder<uint8_t> dyes{shape};
    tensors::SparseTensorBuilder<uint8_t> moistures{shape};
    tensors::SparseTensorBuilder<uint8_t> growths{shape};

    for (const auto& [key, entry] : entries_) {
      auto pos = tensors::decode_tensor_pos32(key);
      if (entry.kind == EntryKind::BLOCK) {
        blocks.set(pos, entry.block.block_id);
        isomorphisms.set(pos, entry.block.isomorphism_id);
        dyes.set(pos, static_cast<uint8_t>(entry.block.dye));
        moistures.set(pos, static_cast<uint8_t>(entry.block.moisture));
      } else if (entry.kind == EntryKind::FLORA) {
        florae.set(pos, entry.flora.flora_id);
        growths.set(pos, entry.flora.growth);
      } else if (entry.kind == EntryKind::GLASS) {
        glasses.set(pos, entry.glass.glass_id);
        isomorphisms.set(pos, entry.glass.isomorphism_id);
        dyes.set(pos, static_cast<uint8_t>(entry.glass.dye));
        moistures.set(pos, static_cast<uint8_t>(entry.glass.moisture));
      }
    }

    return Tensor{
        std::move(blocks).build(),
        std::move(florae).build(),
        std::move(glasses).build(),
        std::move(isomorphisms).build(),
        std::move(dyes).build(),
        std::move(moistures).build(),
        std::move(growths).build()};
  }

 private:
  std::unordered_map<uint32_t, Entry> entries_;
  Vec3u extent_{0, 0, 0};
};

inline auto to_tensor(
    const terrain::Tensor& terrain,
    const shapes::Tensor& isomorphisms,
    const blocks::DyeTensor& dyes,
    const blocks::MoistureTensor& moistures,
    const florae::GrowthTensor& growths) {
  return Tensor{
      terrain::to_blocks(terrain),
      terrain::to_florae(terrain),
      terrain::to_glass(terrain),
      isomorphisms,
      dyes,
      moistures,
      growths};
}

const cereal::size_type kGroupTensorHeaderV3 = 0x6e909064u;
const cereal::size_type kGroupTensorHeaderV4 = 0x6e909065u;

template <typename Archive>
inline auto save(Archive& ar, const Tensor& tensor) {
  ar(cereal::make_size_tag(kGroupTensorHeaderV4));
  ar(tensor.blocks);
  ar(tensor.florae);
  ar(tensor.glasses);
  ar(tensor.isomorphisms);
  ar(tensor.dyes);
  ar(tensor.moistures);
  ar(tensor.growths);
}

template <typename Archive>
inline auto load(Archive& ar, Tensor& tensor) {
  cereal::size_type size_or_header;
  ar(cereal::make_size_tag(size_or_header));

  switch (size_or_header) {
    case kGroupTensorHeaderV4:
      ar(tensor.blocks);
      ar(tensor.florae);
      ar(tensor.glasses);
      ar(tensor.isomorphisms);
      ar(tensor.dyes);
      ar(tensor.moistures);
      ar(tensor.growths);
      break;

    case kGroupTensorHeaderV3:
      ar(tensor.blocks);
      ar(tensor.florae);
      ar(tensor.isomorphisms);
      ar(tensor.dyes);
      ar(tensor.moistures);
      ar(tensor.growths);
      break;
  }
}

static constexpr auto kMaxAtlasDim = 2048u;

class TextureAtlaser {
 public:
  explicit TextureAtlaser(Vec2u dim) : dim_(dim), cursor_{0, 0} {}

  auto add(uint32_t offset) {
    auto [it, created] = index_.emplace(offset, cursor_);
    if (created) {
      cursor_.x += dim_.x;
      if (cursor_.x >= kMaxAtlasDim) {
        cursor_.x = 0;
        cursor_.y += dim_.y;
      }
    }
    return it->second;
  }

  auto uv_scale() const {
    return dim_.template to<float>();
  }

  auto size() const {
    auto w = cursor_.y > 0 ? kMaxAtlasDim : cursor_.x + dim_.x;
    auto h = cursor_.y + dim_.y;
    return vec2(w, h);
  }

  auto normalize(Vec2f coord) const {
    return coord / size().template to<float>();
  }

  auto make_atlas(const std::vector<Texture>& textures) const {
    auto [w, h] = size();

    Texture ret;
    ret.shape = vec2(h, w);
    ret.data.resize(w * h);
    for (const auto& [offset, pos] : index_) {
      auto texture = textures.at(offset);
      for (auto y = 0u; y < dim_.y; y += 1) {
        for (auto x = 0u; x < dim_.x; x += 1) {
          auto i = x + y * dim_.x;
          auto j = pos.x + x + (pos.y + y) * w;
          ret.data[j] = texture.data[i];
        }
      }
    }

    return ret;
  }

 private:
  Vec2u dim_;
  Vec2u cursor_;
  std::unordered_map<uint32_t, Vec2u> index_;
};

inline auto texture_dim(
    const std::vector<uint32_t>& offsets,
    const std::vector<Texture>& textures) {
  if (offsets.empty()) {
    return vec2(0u, 0u);
  } else {
    return textures[offsets[0]].shape;
  }
}

struct BlockQuad {
  Vec3f pos;
  voxels::Dir dir;
  Vec2f uv;
  shapes::Level lvl;
};

inline auto make_blocklike_mesh(
    const TextureAtlaser& atlaser,
    const std::vector<Texture>& textures,
    const std::vector<BlockQuad>& quads) {
  Mesh mesh;
  mesh.texture = atlaser.make_atlas(textures);

  auto to_voxel_space = [](Vec3f pos, shapes::Level lvl) {
    if (lvl == shapes::Level::MICRO) {
      return pos * shapes::kInvMicroScale;
    } else {
      return pos;
    }
  };

  // Populate the mesh with all faces.
  uint32_t index_offset = 0;
  for (const auto& quad : quads) {
    // Push back the quad vertices.
    for (auto vertex : voxels::face_vertices(quad.dir)) {
      auto lvl = quad.lvl;
      auto origin = to_voxel_space(quad.pos, lvl);
      auto offset = to_voxel_space(vertex, lvl);

      // Work out the vertex position and normal.
      auto pos = origin + offset;
      auto normal = voxels::face_normal(quad.dir);

      // Work out the uv coordinates in voxel space.
      auto uv = voxels::face_modular_uv_coords(origin, quad.dir);
      uv += voxels::face_uv_coords(offset, quad.dir);
      uv = atlaser.normalize(atlaser.uv_scale() * uv + quad.uv);

      mesh.vertices.push_back({pos, normal, uv});
    }

    // Push back the quad indices.
    for (auto i : voxels::face_indices()) {
      mesh.indices.push_back(index_offset + i);
    }
    index_offset += 4;
  }

  return mesh;
}

inline auto populate_block_mesh(const Tensor& tensor, const Index& index) {
  // Generate the tensor of the blocks shape isomorphisms.
  // NOTE: We mask out shape overrides for voxels with an empty block.
  auto block_mask = tensors::map_values(tensor.blocks, [](auto val) {
    return !!val;
  });
  auto isomorphisms = csg::merge(
      shapes::to_tensor(tensor.blocks, shapes::to_isomorphism_id(1, 0)),
      csg::slice(tensor.isomorphisms, block_mask));

  // Generate the tensor of occlusion masks.
  auto occlusions = shapes::to_occlusion_tensor(isomorphisms, index.shapes);

  // Generate the tensor of block criteria.
  auto block_samples = blocks::to_block_sample_tensor(
      tensor.blocks,
      tensor.dyes,
      tensors::make_tensor<muck::Muck>(tensor.blocks.shape),
      tensor.moistures,
      index.blocks);

  // Initialize the texture atlaser.
  TextureAtlaser atlaser(texture_dim(index.block_offsets, index.textures));

  // Collect all of the quads in the output.
  std::vector<BlockQuad> quads;
  shapes::emit_quads(
      isomorphisms,
      occlusions,
      index.shapes,
      [&](Vec3u pos, voxels::Dir dir, shapes::Quad quad) {
        // Work out the texture offset.
        auto sample_id = blocks::decode_offset(block_samples.get(pos));
        auto offset_key = 6 * sample_id + static_cast<uint32_t>(dir);
        auto texture_offset = index.block_offsets.at(offset_key);
        auto uv = atlaser.add(texture_offset).template to<float>();

        // Emit the quad to the respective collection.
        auto scaled_pos = pos.template to<int>();
        if (quad.lvl == shapes::Level::MICRO) {
          scaled_pos = shapes::kMicroScale * scaled_pos + quad.pos;
        }
        quads.push_back({scaled_pos.template to<float>(), dir, uv, quad.lvl});
      });

  return make_blocklike_mesh(atlaser, index.textures, quads);
}

inline auto populate_glass_mesh(const Tensor& tensor, const Index& index) {
  // Generate the tensor of the shape isomorphisms.
  // NOTE: We mask out shape overrides for voxels without glass blocks.
  auto glass_mask = tensors::map_values(tensor.glasses, [](auto val) {
    return !!val;
  });
  auto isomorphisms = csg::merge(
      shapes::to_tensor(tensor.glasses, shapes::to_isomorphism_id(1, 0)),
      csg::slice(tensor.isomorphisms, glass_mask));

  // Generate the tensor of occlusion masks.
  auto occlusions = shapes::to_glass_occlusion_tensor(
      isomorphisms, tensor.glasses, tensor.dyes, index.shapes);

  // Generate the tensor of block criteria.
  auto glass_samples = blocks::to_block_sample_tensor(
      tensor.glasses,
      tensor.dyes,
      tensors::make_tensor<muck::Muck>(tensor.glasses.shape),
      tensor.moistures,
      index.glass);

  // Initialize the texture atlaser.
  TextureAtlaser atlaser(texture_dim(index.glass_offsets, index.textures));

  // Collect all of the quads in the output.
  std::vector<BlockQuad> quads;
  shapes::emit_quads(
      isomorphisms,
      occlusions,
      index.shapes,
      [&](Vec3u pos, voxels::Dir dir, shapes::Quad quad) {
        // Work out the texture offset.
        auto sample_id = blocks::decode_offset(glass_samples.get(pos));
        auto offset_key = 6 * sample_id + static_cast<uint32_t>(dir);
        auto texture_offset = index.glass_offsets.at(offset_key);
        auto uv = atlaser.add(texture_offset).template to<float>();

        // Emit the quad to the respective collection.
        auto scaled_pos = pos.template to<int>();
        if (quad.lvl == shapes::Level::MICRO) {
          scaled_pos = shapes::kMicroScale * scaled_pos + quad.pos;
        }
        quads.push_back({scaled_pos.template to<float>(), dir, uv, quad.lvl});
      });

  return make_blocklike_mesh(atlaser, index.textures, quads);
}

inline auto populate_flora_mesh(const Tensor& tensor, const Index& index) {
  TextureAtlaser atlaser(texture_dim(index.flora_offsets, index.textures));

  // Build the flora mesh.
  auto geometry = florae::to_geometry(
      tensor.florae,
      tensor.growths,
      tensors::make_tensor<muck::Muck>(tensor.florae.shape),
      index.florae,
      {0, 0, 0});

  // Copy the flora mesh over to the group format.
  Mesh mesh;
  mesh.indices = std::move(geometry.indices);
  for (const auto& vertex : geometry.vertices) {
    auto texture_id = static_cast<uint32_t>(vertex.texture);
    auto offset = index.flora_offsets.at(texture_id);
    auto uv_base = atlaser.add(offset).template to<float>();
    auto uv_scale = atlaser.uv_scale();
    auto uv = uv_base + uv_scale * vertex.uv;
    mesh.vertices.push_back({vertex.pos, vertex.normal, uv});
  }
  for (auto& vertex : mesh.vertices) {
    vertex.uv = atlaser.normalize(vertex.uv);
  }

  mesh.texture = atlaser.make_atlas(index.textures);

  return mesh;
}

inline auto to_mesh(const Tensor& tensor, const Index& index) {
  CHECK_ARGUMENT(tensor.blocks.shape == tensors::kChunkShape);
  CHECK_ARGUMENT(tensor.florae.shape == tensors::kChunkShape);
  CHECK_ARGUMENT(tensor.glasses.shape == tensors::kChunkShape);
  CombinedMesh ret;
  ret.blocks = populate_block_mesh(tensor, index);
  ret.florae = populate_flora_mesh(tensor, index);
  ret.glass = populate_glass_mesh(tensor, index);
  return ret;
}

inline auto to_wireframe_mesh(
    const Tensor& tensor, const shapes::Index& index) {
  shapes::WireframeMeshBuilder builder;

  tensors::scan_sparse(
      tensors::map_sparse(
          tensor.blocks,
          [&](auto pos, auto _) {
            auto id = tensor.isomorphisms.get(pos);
            id = id == 0u ? shapes::to_isomorphism_id(1, 0) : id;
            return shapes::to_shape_id(id) > 0 ? index.offsets.at(id) : 0;
          }),
      [&](auto pos, auto offset) {
        const auto& mesh = index.wireframe_meshes.at(offset);
        builder.add_transformed_triangles(
            mesh.vertices, mesh.indices, [&](Vec3f v) {
              return v + to<float>(pos);
            });
      });

  return builder.build();
}

inline auto to_box_list(
    const Index& index, const Tensor& tensor, Vec3d origin) {
  // Any non-empty voxel is considered colliding.
  return collision::to_box_list(
      tensors::merge(
          tensor.blocks,
          tensor.florae,
          [](auto block_id, auto flora_id) {
            return block_id || flora_id;
          }),
      origin);
}

}  // namespace voxeloo::galois::groups

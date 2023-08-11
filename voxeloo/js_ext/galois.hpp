#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voxeloo/biomes/memoize.hpp"
#include "voxeloo/biomes/migration.hpp"
#include "voxeloo/biomes/shards.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/gaia/light.hpp"
#include "voxeloo/galois/blocks.hpp"
#include "voxeloo/galois/collision.hpp"
#include "voxeloo/galois/csg.hpp"
#include "voxeloo/galois/florae.hpp"
#include "voxeloo/galois/groups.hpp"
#include "voxeloo/galois/lighting.hpp"
#include "voxeloo/galois/material_properties.hpp"
#include "voxeloo/galois/shapes.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/galois/water.hpp"
#include "voxeloo/js_ext/biomes.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::js {

namespace em = emscripten;
namespace js = voxeloo::js;

template <typename Val>
using BufferJs = buffers::js::BufferJs<Val>;

template <typename T>
inline auto to_buffer(const uint8_t* data, size_t size) {
  return buffers::js::to_buffer<T>(data, size);
}

using blocks::BlockId;
using florae::FloraId;
using shapes::IsomorphismId;
using terrain::TerrainId;

template <typename T>
using Tensor = tensors::Tensor<T>;

template <typename T>
inline auto make_shard_cache(emscripten::val loader) {
  return MemoizeLastAll([&](int x, int y, int z) -> const T* {
    auto pos = vec3(x, y, z);
    auto val = loader(shards::js::shard_encode_js(pos));
    if (!val.isNull() && !val.isUndefined()) {
      return js::as_ptr<T>(val);
    }
    return nullptr;
  });
}

inline auto to_occlusion_tensor(
    const shapes::Tensor& tensor,
    const shapes::Index& index,
    Vec3i origin,
    emscripten::val loader) {
  auto cache = make_shard_cache<shapes::Tensor>(loader);

  // Extract the tensors self-occlusion values.
  auto masks = tensors::map_values(tensor, [&](auto id) {
    return index.occlusion_masks.at(index.offsets.at(id));
  });

  return shapes::to_occlusion_tensor(masks, [&](Vec3i pos) {
    auto [shard, local] = shards::block_partition(origin + pos);
    if (auto isomorphisms = cache(shard.x, shard.y, shard.z); isomorphisms) {
      auto isomorphism_id = isomorphisms->get(local);
      return index.occlusion_masks.at(index.offsets.at(isomorphism_id));
    }
    return static_cast<uint8_t>(0);
  });
}

inline auto to_glass_occlusion_tensor(
    const shapes::Tensor& shape_tensor,
    const glass::Tensor& glass,
    const blocks::DyeTensor& dye,
    const shapes::Index& index,
    Vec3i origin,
    emscripten::val shape_loader,
    emscripten::val glass_loader,
    emscripten::val dye_loader) {
  auto shape_cache = make_shard_cache<shapes::Tensor>(shape_loader);
  auto glass_cache = make_shard_cache<glass::Tensor>(glass_loader);
  auto dye_cache = make_shard_cache<blocks::DyeTensor>(dye_loader);

  // Extract the tensors self-occlusion values.
  auto tensor = tensors::map_sparse(shape_tensor, [&](auto pos, auto id) {
    return shapes::pack_glass_key(
        index.occlusion_masks.at(index.offsets.at(id)),
        glass.get(pos),
        dye.get(pos));
  });

  return shapes::to_glass_occlusion_tensor(tensor, [&](Vec3i pos) {
    auto [shard, local] = shards::block_partition(origin + pos);
    const uint32_t empty = 0u;
    auto* isomorphisms = shape_cache(shard.x, shard.y, shard.z);
    if (!isomorphisms) {
      return empty;
    }
    auto* glass = glass_cache(shard.x, shard.y, shard.z);
    if (!glass) {
      return empty;
    }
    auto* dye = dye_cache(shard.x, shard.y, shard.z);
    if (!dye) {
      return empty;
    }

    return shapes::pack_glass_key(
        index.occlusion_masks.at(index.offsets.at(isomorphisms->get(local))),
        glass->get(local),
        dye->get(local));
  });
}

template <typename GeometryBuffer>
inline auto geometry_buffer_to_value_object(
    const Vec3i& origin, const GeometryBuffer& geometry_buffer)
    -> emscripten::val {
  auto ret = emscripten::val::object();
  ret.set("origin", emscripten::val(origin));
  ret.set("stride", emscripten::val(geometry_buffer.stride()));
  ret.set(
      "indices",
      emscripten::val::global("Uint32Array")
          .new_(to_buffer<uint32_t>(
              geometry_buffer.indices_view(),
              geometry_buffer.indices_bytes())));
  ret.set(
      "vertices",
      emscripten::val::global("Float32Array")
          .new_(to_buffer<float>(
              geometry_buffer.vertices_view(),
              geometry_buffer.vertices_bytes())));
  ret.set("empty", emscripten::val(geometry_buffer.indices.empty()));

  return ret;
}

inline auto to_block_geometry(
    const shapes::Tensor& tensor,
    const shapes::OcclusionTensor& occlusion,
    const shapes::Index& index,
    Vec3i origin) {
  return geometry_buffer_to_value_object(
      origin, shapes::to_geometry_buffer(tensor, occlusion, index));
}

class BlockMaterialBuffer {
 public:
  explicit BlockMaterialBuffer(material_properties::Buffer impl)
      : impl_(std::move(impl)) {}

  auto rank_shape() const {
    return Vec2u(impl_.rank.shape);
  }

  auto rank_view() const {
    return to_buffer<uint32_t>(impl_.rank.view(), impl_.rank.bytes());
  }

  auto data_shape() const {
    return Vec2u(impl_.data.shape);
  }

  auto data_view() const {
    return to_buffer<uint32_t>(impl_.data.view(), impl_.data.bytes());
  }

 private:
  material_properties::Buffer impl_;
};

inline auto to_block_material_buffer(
    const blocks::BlockSampleTensor& block_samples,
    const florae::GrowthTensor& growth,
    const muck::Tensor& muck) {
  return BlockMaterialBuffer(
      blocks::to_material_buffer(block_samples, growth, muck));
}

class LightingBuffer {
 public:
  explicit LightingBuffer(lighting::Buffer impl) : impl_(std::move(impl)) {}

  auto rank_shape() const {
    return Vec2u(impl_.rank.shape);
  }

  auto rank_view() const {
    return to_buffer<uint32_t>(impl_.rank.view(), impl_.rank.bytes());
  }

  auto data_shape() const {
    return Vec2u(impl_.data.shape);
  }

  auto data_view() const {
    return to_buffer<uint32_t>(impl_.data.view(), impl_.data.bytes());
  }

 private:
  lighting::Buffer impl_;
};

template <typename T>
inline auto to_lighting_buffer(
    const tensors::Tensor<T>& tensor,
    Vec3i origin,
    emscripten::val isomorphism_loader,
    emscripten::val sky_occlusion_loader,
    emscripten::val irradiance_loader) {
  // Function to sample the isomorphism tensor at a shard-relative coordinate.
  /*
  auto iso_cache = make_shard_cache<shapes::Tensor>(isomorphism_loader);
  auto iso_fn = [&](Vec3i pos) {
    auto [shard, local] = shards::block_partition(origin + pos);
    if (auto tensor = iso_cache(shard.x, shard.y, shard.z); tensor) {
      return tensor->get(local);
    }
    return 0u;
  };
  */

  // Function to sample the irradiance tensor at a shard-relative coordinate.
  auto irr_cache = make_shard_cache<Tensor<uint32_t>>(irradiance_loader);
  auto irr_light_fn = [&](Vec3i pos) -> Vec3f {
    auto [shard, local] = shards::block_partition(origin + pos);
    if (auto tensor = irr_cache(shard.x, shard.y, shard.z); tensor) {
      auto val = tensor->get(local);
      auto colour = gaia::Colour::unpack(val);
      if (colour.intensity != 0) {
        return colour.rgb * colour.intensity / (15.f * 255.f);
      }
    }
    return Vec3f{0.0, 0.0, 0.0};
  };

  // Function to sample the sky-occlusion tensor at a shard-relative coordinate.
  auto sky_cache = make_shard_cache<Tensor<uint8_t>>(sky_occlusion_loader);
  auto sky_light_fn = [&](Vec3i pos) -> Vec3f {
    auto [shard, local] = shards::block_partition(origin + pos);
    if (auto tensor = sky_cache(shard.x, shard.y, shard.z); tensor) {
      // While we don't need rgba for sky occlusion, using the same type as
      // irradiance simplies some of the code.
      float value = 1.0f - tensor->get(local) / 15.0f;
      return Vec3f{value, value, value};
    }
    return Vec3f{1.0, 1.0, 1.0};
  };

  // Cached routine producing irradiance lighting at a given voxel vertex.
  auto irr_fn = conv::BlockCache(lighting::make_vertex_fn(
      [&](Vec3i pos) {
        return false;
        // return iso_fn(pos) == 1u;  // full
      },
      irr_light_fn));

  // Cached routine producing sky-occlusion lighting at a given voxel vertex.
  auto sky_fn = conv::BlockCache(lighting::make_vertex_fn(
      [&](Vec3i pos) {
        return false;
        // return iso_fn(pos) == 1u;  // full
      },
      sky_light_fn));

  return LightingBuffer(lighting::to_buffer(tensor, irr_fn, sky_fn));
}

inline auto to_block_lighting_buffer(
    const blocks::Tensor& tensor,
    Vec3i origin,
    emscripten::val isomorphism_loader,
    emscripten::val sky_occlusion_loader,
    emscripten::val irradiance_loader) {
  return to_lighting_buffer(
      tensor,
      origin,
      isomorphism_loader,
      sky_occlusion_loader,
      irradiance_loader);
}

inline auto to_flora_lighting_buffer(
    const florae::Tensor& tensor,
    Vec3i origin,
    emscripten::val isomorphism_loader,
    emscripten::val sky_occlusion_loader,
    emscripten::val irradiance_loader) {
  return to_lighting_buffer(
      tensor,
      origin,
      isomorphism_loader,
      sky_occlusion_loader,
      irradiance_loader);
}

inline auto to_water_lighting_buffer(
    const water::Tensor& tensor,
    Vec3i origin,
    emscripten::val isomorphism_loader,
    emscripten::val sky_occlusion_loader,
    emscripten::val irradiance_loader) {
  return to_lighting_buffer(
      tensor,
      origin,
      isomorphism_loader,
      sky_occlusion_loader,
      irradiance_loader);
}

class FloraMaterialBuffer {
 public:
  explicit FloraMaterialBuffer(material_properties::Buffer impl)
      : impl_(std::move(impl)) {}

  auto rank_shape() const {
    return Vec2u(impl_.rank.shape);
  }

  auto rank_view() const {
    return to_buffer<uint32_t>(impl_.rank.view(), impl_.rank.bytes());
  }

  auto data_shape() const {
    return Vec2u(impl_.data.shape);
  }

  auto data_view() const {
    return to_buffer<uint32_t>(impl_.data.view(), impl_.data.bytes());
  }

 private:
  material_properties::Buffer impl_;
};

inline auto to_flora_material_buffer(
    const florae::Tensor& tensor,
    const florae::GrowthTensor& growth,
    const muck::Tensor& muck,
    const florae::Index& index) {
  return FloraMaterialBuffer(
      florae::to_material_buffer(tensor, growth, muck, index));
}

inline auto to_flora_geometry(
    const terrain::Tensor& tensor,
    const florae::GrowthTensor& growths,
    const muck::Tensor& mucks,
    const florae::Index& index,
    Vec3i origin) {
  return geometry_buffer_to_value_object(
      origin, florae::to_geometry(tensor, growths, mucks, index, origin));
}

inline auto is_non_colliding_terrain_id(uint32_t id) {
  // TODO(taylor): Get rid of this once we have the proper terrain_shard to AABB
  // structure in place (e.g. build AABB structure from a terrain index).
  if (terrain::is_flora_id(id)) {
    auto flora_id = terrain::to_flora_id(id);
    auto is_leaf = flora_id < 3;
    auto is_vine = flora_id == 19 || flora_id == 20;
    auto is_shrub = flora_id == 21;
    return !is_leaf && !is_vine && !is_shrub;
  }
  return false;
}

inline auto to_terrain_tensor(
    const biomes::js::VolumeBlockJs<uint32_t>& shard) {
  return biomes::migration::tensor_from_volume_block(shard.impl());
}

inline auto load_terrain_tensor(
    terrain::Tensor& terrain,
    const biomes::js::VolumeBlockJs<uint32_t>& shard) {
  terrain = biomes::migration::tensor_from_volume_block(shard.impl());
}

inline auto to_isomorphism_tensor(
    const biomes::js::SparseBlockJs<uint32_t>& shard) {
  tensors::SparseChunkBuilder<IsomorphismId> builder;
  shard.impl().scan([&](auto x, auto y, auto z, auto id) {
    builder.set({x, y, z}, id);
  });
  return tensors::make_tensor(std::move(builder).build());
}

inline auto to_merged_isomorphism_tensor(
    const blocks::Tensor& blocks,
    const shapes::Tensor& isomorphisms,
    shapes::IsomorphismId default_id) {
  return csg::sparse_merge(shapes::to_tensor(blocks, default_id), isomorphisms);
}

inline auto to_dense_isomorphism_tensor(
    const terrain::Tensor& tensor, const shapes::Tensor& isomorphisms) {
  const auto default_shapes =
      tensors::map_sparse(tensor, [](auto _, TerrainId id) {
        return terrain::is_collidable(id) ? shapes::to_isomorphism_id(1, 0) : 0;
      });
  return csg::sparse_merge(default_shapes, isomorphisms);
}

inline auto clear_non_colliding_blocks(
    const biomes::js::VolumeBlockJs<uint32_t>& shard) {
  biomes::js::VolumeBlockJs<uint32_t> ret;
  shard.impl().scan([&](auto x, auto y, auto z, auto v) {
    ret.set(x, y, z, is_non_colliding_terrain_id(v) ? 0 : v);
  });
  ret.compact();
  return ret;
}

class GroupTensor {
 public:
  GroupTensor() : impl_(groups::TensorBuilder().build()) {}
  explicit GroupTensor(groups::Tensor tensor) : impl_(std::move(tensor)) {}

  auto get(Vec3u pos) const {
    return impl_.get(pos);
  }

  auto scan(emscripten::val cb) const {
    impl_.scan([&](auto pos, auto val) {
      cb(pos, val);
    });
  }

  auto save() const {
    return impl_.save();
  }

  void load(const std::string& blob) {
    impl_.load(blob);
  }

  auto& impl() const {
    return impl_;
  }

  groups::Tensor impl_;
};

using blocks::BlockId;
using florae::FloraId;
using glass::GlassId;
using groups::Entry;
using shapes::IsomorphismId;

class GroupTensorBuilder {
 public:
  void set_block(
      Vec3u pos,
      BlockId block,
      IsomorphismId isomorphism,
      blocks::Dye dye,
      blocks::Moisture moisture) {
    impl_.set_block(pos, block, isomorphism, dye, moisture);
  }

  void set_glass(
      Vec3u pos,
      GlassId glass,
      IsomorphismId isomorphism,
      blocks::Dye dye,
      blocks::Moisture moisture) {
    impl_.set_glass(pos, glass, isomorphism, dye, moisture);
  }

  void set_flora(Vec3u pos, FloraId flora, florae::Growth growth) {
    impl_.set_flora(pos, flora, growth);
  }

  void del(Vec3u pos) {
    impl_.del(pos);
  }

  auto get(Vec3u pos) {
    return impl_.get(pos);
  }

  auto build() {
    return GroupTensor(impl_.build());
  }

 private:
  groups::TensorBuilder impl_;
};

class GroupSubMesh {
 public:
  GroupSubMesh() = default;
  explicit GroupSubMesh(groups::Mesh impl) : impl_(std::move(impl)) {}

  auto empty() const {
    return impl_.indices.empty();
  }

  auto stride() const {
    return impl_.stride();
  }

  auto indices() const {
    return to_buffer<uint32_t>(impl_.indices_view(), impl_.indices_bytes());
  }

  auto vertices() const {
    return to_buffer<float>(impl_.vertices_view(), impl_.vertices_bytes());
  }

  auto texture_shape() const {
    return impl_.texture.shape;
  }

  auto texture_data() const {
    return to_buffer<uint8_t>(impl_.texture.ptr(), impl_.texture.bytes());
  }

 private:
  groups::Mesh impl_;
};

struct GroupMesh {
  GroupSubMesh blocks;
  GroupSubMesh florae;
  GroupSubMesh glass;
};

class WireframeMeshJs {
 public:
  WireframeMeshJs() = default;
  explicit WireframeMeshJs(shapes::WireframeMesh impl)
      : impl_(std::move(impl)) {}

  auto empty() const {
    return impl_.indices.empty();
  }

  auto stride() const {
    return impl_.stride();
  }

  auto indices() const {
    return to_buffer<uint32_t>(impl_.indices_view(), impl_.indices_bytes());
  }

  auto vertices() const {
    return to_buffer<float>(impl_.vertices_view(), impl_.vertices_bytes());
  }

 private:
  shapes::WireframeMesh impl_;
};

inline auto to_group_mesh(
    const GroupTensor& tensor, const groups::Index& index) {
  auto mesh = groups::to_mesh(tensor.impl(), index);
  return GroupMesh{
      GroupSubMesh(std::move(mesh.blocks)),
      GroupSubMesh(std::move(mesh.florae)),
      GroupSubMesh(std::move(mesh.glass)),
  };
}

inline auto to_block_samples(
    blocks::Index& index,
    uint8_t dye,
    uint8_t muck,
    uint8_t moisture,
    blocks::BlockId id,
    BufferJs<uint32_t>& buffer) {
  const auto dyeLevel = static_cast<blocks::Dye>(dye);
  const auto muckLevel = static_cast<blocks::MuckLevel>(muck);
  const auto moistureLevel = static_cast<blocks::MoistureLevel>(moisture);
  uint16_t black_tag = blocks::encode_criteria(
      blocks::CheckboardPosition::Black, dyeLevel, muckLevel, moistureLevel);
  const blocks::Samples& black_samples = get_samples(index, id, black_tag);

  uint16_t white_tag = blocks::encode_criteria(
      blocks::CheckboardPosition::White, dyeLevel, muckLevel, moistureLevel);
  const blocks::Samples& white_samples = get_samples(index, id, white_tag);

  buffer.resize(black_samples.count + white_samples.count);

  auto* back = &buffer.impl[0];
  for (int i = 0; i < black_samples.count; ++i) {
    *back++ = black_samples.offsets[i];
  }
  for (int i = 0; i < white_samples.count; ++i) {
    *back++ = white_samples.offsets[i];
  }
}

inline auto to_water_geometry(
    const water::Tensor& surface,
    emscripten::val isomorphism_loader,
    emscripten::val water_loader,
    Vec3i origin) {
  auto iso_cache = make_shard_cache<shapes::Tensor>(isomorphism_loader);
  auto wat_cache = make_shard_cache<water::Tensor>(water_loader);

  auto air_fn = [&](Vec3i pos) {
    auto [shard, local] = shards::block_partition(pos);
    if (auto tensor = iso_cache(shard.x, shard.y, shard.z); tensor) {
      return tensor->get(local) == 0;
    }
    return true;
  };

  auto water_fn = [&](Vec3i pos) {
    auto [shard, local] = shards::block_partition(pos);
    if (auto tensor = wat_cache(shard.x, shard.y, shard.z); tensor) {
      return tensor->get(local);
    }
    return static_cast<uint8_t>(0);
  };

  // Define the actual height kernel function that is based on the location
  // of water voxels and air (i.e. empty) voxels. Memoize lookups with a
  // cache.
  conv::BlockCache cached_edge_fn(
      [origin, kernel = water::make_kernel_fn(air_fn, water_fn)](Vec3i pos) {
        return kernel(origin + pos);
      });

  auto height_fn = [&](Vec3u pos) {
    water::HeightMask mask{0};
    mask.set({0u, 0u}, cached_edge_fn(to<int>(pos) + vec3(0, 0, 0)));
    mask.set({1u, 0u}, cached_edge_fn(to<int>(pos) + vec3(1, 0, 0)));
    mask.set({0u, 1u}, cached_edge_fn(to<int>(pos) + vec3(0, 0, 1)));
    mask.set({1u, 1u}, cached_edge_fn(to<int>(pos) + vec3(1, 0, 1)));
    return mask;
  };

  return geometry_buffer_to_value_object(
      origin, water::to_geometry(surface, origin, height_fn));
}

inline auto to_water_surface(
    const water::Tensor& tensor, Vec3i origin, emscripten::val water_loader) {
  auto cache = make_shard_cache<water::Tensor>(water_loader);
  auto is_water_fn = [&](Vec3i pos) {
    constexpr static auto k = static_cast<int>(tensors::kChunkDim);
    auto shift = pos + origin;
    auto shard = floor_div(shift, k);
    auto local = to<unsigned int>(shift - k * shard);
    if (auto water_tensor = cache(shard.x, shard.y, shard.z); water_tensor) {
      return water_tensor->get(local) != 0;
    }
    return false;
  };
  return water::to_surface(tensor, is_water_fn);
}

class WaterMaterialBuffer {
 public:
  explicit WaterMaterialBuffer(material_properties::Buffer impl)
      : impl_(std::move(impl)) {}

  auto rank_shape() const {
    return Vec2u(impl_.rank.shape);
  }

  auto rank_view() const {
    return to_buffer<uint32_t>(impl_.rank.view(), impl_.rank.bytes());
  }

  auto data_shape() const {
    return Vec2u(impl_.data.shape);
  }

  auto data_view() const {
    return to_buffer<uint32_t>(impl_.data.view(), impl_.data.bytes());
  }

 private:
  material_properties::Buffer impl_;
};

inline auto to_water_material_buffer(
    const water::Tensor& tensor, const muck::Tensor& muck) {
  return WaterMaterialBuffer(water::to_material_buffer(tensor, muck));
}

class BoxDictJs {
 public:
  explicit BoxDictJs(collision::BoxDict impl) : impl_(std::move(impl)) {}

  auto size() const {
    return impl_.size();
  }

  void scan(emscripten::val callback) {
    impl_.scan([&](const collision::AABB& box) {
      callback(box);
    });
  }

  void intersect(const collision::AABB& aabb, emscripten::val callback) {
    impl_.intersect(aabb, [&](const collision::AABB& box) {
      return callback(box).as<bool>();
    });
  }

  bool intersects(const collision::AABB& aabb) {
    return impl_.intersects(aabb);
  }

 private:
  const collision::BoxDict impl_;
};

class BoxListJs {
 public:
  BoxListJs() = default;
  explicit BoxListJs(collision::BoxList impl) : impl_(std::move(impl)) {}

  auto size() const {
    return impl_.size();
  }

  void merge(const BoxListJs& other) {
    extend(impl_, other.impl_);
  }

  void add(const collision::AABB& aabb) {
    impl_.push_back(aabb);
  }

  auto to_dict() {
    return BoxDictJs(collision::to_box_dict(impl_));
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  collision::BoxList impl_;
};

inline auto to_isomorphism_box_list(
    const shapes::Index& index, const shapes::Tensor& tensor, Vec3d origin) {
  return BoxListJs(shapes::to_box_list(index, tensor, origin));
}

inline auto to_flora_box_list(
    const florae::Index& index, const florae::Tensor& tensor, Vec3d origin) {
  return BoxListJs(florae::to_box_list(index, tensor, origin));
}

inline auto to_water_box_dict(const water::Tensor& tensor, Vec3d origin) {
  return BoxDictJs(collision::to_box_dict(tensor, origin));
}

inline auto to_group_box_list(
    const groups::Index& index, const GroupTensor& tensor, Vec3d origin) {
  return BoxListJs(groups::to_box_list(index, tensor.impl_, origin));
}

inline auto to_isomorphism_occluder(
    const shapes::Index& index, const shapes::Tensor& tensor, Vec3d origin) {
  return shapes::to_occluder(index, tensor, origin);
}

inline auto to_wireframe_mesh(
    const GroupTensor& tensor, const shapes::Index& index) {
  return WireframeMeshJs(groups::to_wireframe_mesh(tensor.impl(), index));
}

inline void bind_blocks() {
  em::class_<blocks::Index>("BlockIndex")
      .constructor()
      .function("load", &blocks::Index::load);

  em::class_<BlockMaterialBuffer>("BlockMaterialBuffer")
      .function("rankShape", &BlockMaterialBuffer::rank_shape)
      .function("rankView", &BlockMaterialBuffer::rank_view)
      .function("dataShape", &BlockMaterialBuffer::data_shape)
      .function("dataView", &BlockMaterialBuffer::data_view);

  em::function("toSurfaceTensor", blocks::to_surface_tensor);
  em::function("toBlockSampleTensor", blocks::to_block_sample_tensor);
  em::function("toBlockMaterialBuffer", to_block_material_buffer);
  em::function("toBlockGeometry", to_block_geometry);
  em::function("toBlockSamples", to_block_samples);
}

inline void bind_collision() {
  em::value_array<collision::AABB>("AABB")
      .element(&collision::AABB::v0)
      .element(&collision::AABB::v1);

  em::class_<BoxListJs>("BoxList")
      .constructor()
      .function("size", &BoxListJs::size)
      .function("merge", &BoxListJs::merge)
      .function("add", &BoxListJs::add)
      .function("toDict", &BoxListJs::to_dict);

  em::class_<BoxDictJs>("BoxDict")
      .function("size", &BoxDictJs::size)
      .function("scan", &BoxDictJs::scan)
      .function("intersect", &BoxDictJs::intersect)
      .function("intersects", &BoxDictJs::intersects);
}

inline auto subvoxel_ray_intersection(
    const shapes::Index& shapeIndex,
    const uint32_t isomorphismId,
    const Vec3f& rayOrigin,
    const Vec3f& rayDirection) {
  std::optional<voxeloo::voxels::Dir> direction =
      shapes::subvoxel_ray_intersection(
          shapeIndex, isomorphismId, rayOrigin, rayDirection);
  if (direction) {
    return emscripten::val(static_cast<int>(*direction));
  } else {
    return emscripten::val::undefined();
  }
}

inline void bind_shapes() {
  em::value_array<shapes::Edge>("Edge")
      .element(&shapes::Edge::v0)
      .element(&shapes::Edge::v1);

  em::class_<WireframeMeshJs>("WireframeMesh")
      .function("empty", &WireframeMeshJs::empty)
      .function("stride", &WireframeMeshJs::stride)
      .function("indices", &WireframeMeshJs::indices)
      .function("vertices", &WireframeMeshJs::vertices);

  em::class_<shapes::Index>("ShapeIndex")
      .constructor()
      .function("load", &shapes::Index::load);

  em::function("toIsomorphismTensor", to_isomorphism_tensor);
  em::function("toMergedIsomorphismTensor", to_merged_isomorphism_tensor);
  em::function("toDenseIsomorphismTensor", to_dense_isomorphism_tensor);
  em::function("toOcclusionTensor", to_occlusion_tensor);
  em::function("toGlassOcclusionTensor", to_glass_occlusion_tensor);
  em::function("toIsomorphismBoxList", to_isomorphism_box_list);
  em::function("toIsomorphismOccluder", to_isomorphism_occluder);
  em::function("toWireframeMesh", to_wireframe_mesh);
  em::function("subvoxelRayIntersection", subvoxel_ray_intersection);
}

inline void bind_florae() {
  em::class_<florae::Index>("FloraIndex")
      .constructor()
      .function("load", &florae::Index::load);

  em::class_<FloraMaterialBuffer>("FloraMaterialBuffer")
      .function("rankShape", &FloraMaterialBuffer::rank_shape)
      .function("rankView", &FloraMaterialBuffer::rank_view)
      .function("dataShape", &FloraMaterialBuffer::data_shape)
      .function("dataView", &FloraMaterialBuffer::data_view);
  em::function("toFloraMaterialBuffer", to_flora_material_buffer);

  em::function("toFloraGeometry", to_flora_geometry);
  em::function("toFloraBoxList", to_flora_box_list);
}

inline void bind_groups() {
  using groups::BlockEntry;
  using groups::Entry;
  using groups::EntryKind;
  using groups::FloraEntry;
  using groups::GlassEntry;
  using groups::Index;
  using groups::TensorBuilder;

  em::class_<Index>("GroupIndex").constructor().function("load", &Index::load);

  em::enum_<EntryKind>("EntryKind")
      .value("EMPTY", EntryKind::EMPTY)
      .value("BLOCK", EntryKind::BLOCK)
      .value("FLORA", EntryKind::FLORA)
      .value("GLASS", EntryKind::GLASS);

  em::value_object<BlockEntry>("BlockGroupEntry")
      .field("block_id", &BlockEntry::block_id)
      .field("isomorphism_id", &BlockEntry::isomorphism_id)
      .field("dye", &BlockEntry::dye)
      .field("moisture", &BlockEntry::moisture);

  em::value_object<GlassEntry>("GlassGroupEntry")
      .field("glass_id", &GlassEntry::glass_id)
      .field("isomorphism_id", &GlassEntry::isomorphism_id)
      .field("dye", &GlassEntry::dye)
      .field("moisture", &GlassEntry::moisture);

  em::value_object<FloraEntry>("FloraGroupEntry")
      .field("flora_id", &FloraEntry::flora_id)
      .field("growth", &FloraEntry::growth);

  em::value_object<Entry>("GroupEntry")
      .field("kind", &Entry::kind)
      .field("block", &Entry::block)
      .field("flora", &Entry::flora)
      .field("glass", &Entry::glass);

  em::class_<GroupTensor>("GroupTensor")
      .constructor()
      .function("get", &GroupTensor::get)
      .function("scan", &GroupTensor::scan)
      .function("save", &GroupTensor::save)
      .function("load", &GroupTensor::load);

  em::class_<GroupTensorBuilder>("GroupTensorBuilder")
      .constructor()
      .function("setBlock", &GroupTensorBuilder::set_block)
      .function("setGlass", &GroupTensorBuilder::set_glass)
      .function("setFlora", &GroupTensorBuilder::set_flora)
      .function("del", &GroupTensorBuilder::del)
      .function("get", &GroupTensorBuilder::get)
      .function("build", &GroupTensorBuilder::build);

  em::class_<GroupSubMesh>("GroupSubMesh")
      .function("empty", &GroupSubMesh::empty)
      .function("stride", &GroupSubMesh::stride)
      .function("indices", &GroupSubMesh::indices)
      .function("vertices", &GroupSubMesh::vertices)
      .function("textureShape", &GroupSubMesh::texture_shape)
      .function("textureData", &GroupSubMesh::texture_data);

  em::value_object<GroupMesh>("GroupMesh")
      .field("blocks", &GroupMesh::blocks)
      .field("florae", &GroupMesh::florae)
      .field("glass", &GroupMesh::glass);

  em::function("toGroupMesh", to_group_mesh);
  em::function("toGroupBoxList", to_group_box_list);
}

inline void bind_lighting() {
  em::class_<LightingBuffer>("LightingBuffer")
      .function("rankShape", &LightingBuffer::rank_shape)
      .function("rankView", &LightingBuffer::rank_view)
      .function("dataShape", &LightingBuffer::data_shape)
      .function("dataView", &LightingBuffer::data_view);

  em::function("toBlockLightingBuffer", to_block_lighting_buffer);
  em::function("toFloraLightingBuffer", to_flora_lighting_buffer);
  em::function("toWaterLightingBuffer", to_water_lighting_buffer);
}

inline void bind_terrain() {
  em::function("toBlockTensor", terrain::to_blocks);
  em::function("toGlassTensor", terrain::to_glass);
  em::function("toFloraTensor", terrain::to_florae);
  em::function("toTerrainTensor", to_terrain_tensor);
  em::function("loadTerrainTensor", load_terrain_tensor);
  em::function("clearNonCollidingBlocks", clear_non_colliding_blocks);
}

inline void bind_water() {
  em::function("toWaterSurface", to_water_surface);
  em::function("toWaterGeometry", to_water_geometry);
  em::function("toWaterBoxDict", to_water_box_dict);
  em::class_<WaterMaterialBuffer>("WaterMaterialBuffer")
      .function("rankShape", &WaterMaterialBuffer::rank_shape)
      .function("rankView", &WaterMaterialBuffer::rank_view)
      .function("dataShape", &WaterMaterialBuffer::data_shape)
      .function("dataView", &WaterMaterialBuffer::data_view);

  em::function("toWaterMaterialBuffer", to_water_material_buffer);
}

inline void bind() {
  bind_blocks();
  bind_collision();
  bind_florae();
  bind_shapes();
  bind_groups();
  bind_lighting();
  bind_terrain();
  bind_water();
}

}  // namespace voxeloo::galois::js

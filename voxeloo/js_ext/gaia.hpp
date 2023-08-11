#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <memory>
#include <string>

#include "voxeloo/biomes/migration.hpp"
#include "voxeloo/common/hashing.hpp"
#include "voxeloo/gaia/deps.hpp"
#include "voxeloo/gaia/lazy.hpp"
#include "voxeloo/gaia/light.hpp"
#include "voxeloo/gaia/logger.hpp"
#include "voxeloo/gaia/muck.hpp"
#include "voxeloo/gaia/terrain.hpp"
#include "voxeloo/gaia/water.hpp"
#include "voxeloo/js_ext/biomes.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/js_ext/galois.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia::js {

using galois::terrain::TerrainId;

template <typename T>
using BufferJs = buffers::js::BufferJs<T>;

template <typename T>
class StreamReaderJs {
 public:
  explicit StreamReaderJs(const Stream<T>& stream)
      : impl_(stream.subscribe()) {}

  auto open() const {
    return impl_.open();
  }

  auto empty() const {
    return impl_.empty();
  }

  auto close() {
    return impl_.close();
  }

  void read(BufferJs<T>& out) {
    auto batch = impl_.read();
    out.resize(batch.size());
    std::copy(batch.begin(), batch.end(), out.data());
  }

 private:
  StreamReader<T> impl_;
};

class LoggerJs {
 public:
  explicit LoggerJs(emscripten::val log_fn)
      : impl_(make_dep<Logger>([=](const std::string& s) {
          log_fn(s);
        })) {}

  void log(const std::string& msg) {
    impl_->log(msg);
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<Logger> impl_;
};

struct TerrainMapJs {
 public:
  TerrainMapJs() : impl_(make_dep<Lazy<TerrainMap>>()) {}

  auto aabb() const {
    return impl_->get().aabb();
  }

  auto get(int x, int y, int z) const {
    return impl_->get().get({x, y, z});
  }

  auto get_seed(int x, int y, int z) const {
    return impl_->get().get_seed({x, y, z});
  }

  auto get_diff(int x, int y, int z) const {
    if (auto v = impl_->get().get_diff({x, y, z}); v) {
      return emscripten::val(*v);
    }
    return emscripten::val::undefined();
  }

  auto find_seed(TerrainId id, BufferJs<Vec3i>& out) const {
    tensors::BufferBuilder<Vec3i> builder;
    impl_->get().find_seed(id, [&](auto pos) {
      builder.add(pos);
    });
    out.impl = std::move(builder).build();
  }

  auto find_diff(TerrainId id, BufferJs<Vec3i>& out) const {
    tensors::BufferBuilder<Vec3i> builder;
    impl_->get().find_diff(id, [&](auto pos) {
      builder.add(pos);
    });
    out.impl = std::move(builder).build();
  }

  auto find(TerrainId id, BufferJs<Vec3i>& out) const {
    tensors::BufferBuilder<Vec3i> builder;
    impl_->get().find(id, [&](auto pos) {
      builder.add(pos);
    });
    out.impl = std::move(builder).build();
  }

  auto storage_size() const {
    return impl_->get().storage_size();
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<Lazy<TerrainMap>> impl_;
};

class TerrainMapBuilderJs {
  using VolumeBlock = biomes::js::VolumeBlockJs<TerrainId>;
  using SparseBlock = biomes::js::SparseBlockJs<TerrainId>;

 public:
  auto aabb() const {
    return impl_.aabb();
  }

  auto assign_seed(int x, int y, int z, const VolumeBlock& block) {
    // Add the tensor to the gaia map.
    impl_.assign_seed_block(
        vec3(x, y, z),
        biomes::migration::tensor_from_volume_block(block.impl()));
  }

  auto assign_diff(int x, int y, int z, const SparseBlock& block) {
    // Add the tensor to the gaia map.
    impl_.assign_diff_block(
        vec3(x, y, z),
        biomes::migration::tensor_from_sparse_block(block.impl()));
  }

  auto assign_dye(int x, int y, int z, const tensors::Tensor<uint8_t>& block) {
    // Add the tensor to the gaia map.
    impl_.assign_dye_block(vec3(x, y, z), block);
  }

  void build(TerrainMapJs& map) {
    map.impl()->set(std::move(impl_).build());
  }

 private:
  TerrainMapBuilder impl_;
};

class TerrainStreamJs {
 public:
  TerrainStreamJs() : impl_(make_dep<TerrainStream>()) {}

  auto subscribe() const {
    return StreamReaderJs<Vec3i>(*impl_);
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  std::shared_ptr<TerrainStream> impl_;
};

class TerrainWriterJs {
 public:
  TerrainWriterJs(
      const LoggerJs& logger,
      const TerrainMapJs& map,
      const TerrainStreamJs& stream)
      : impl_(make_dep<TerrainWriter>(
            logger.impl(), map.impl(), stream.impl())) {}

  bool update_diff(
      int x, int y, int z, const biomes::js::SparseBlockJs<TerrainId>& block) {
    tensors::SparseTensorBuilder<std::optional<TerrainId>> builder(kShardShape);
    block.impl().scan([&](auto x, auto y, auto z, auto id) {
      builder.set({x, y, z}, id);
    });
    return impl_->update_diff({x, y, z}, std::move(builder).build());
  }

  bool update_dye(int x, int y, int z, const tensors::Tensor<uint8_t>& dye) {
    return impl_->update_dye({x, y, z}, dye);
  }

 private:
  Dep<TerrainWriter> impl_;
};

class SkyOcclusionMapJs {
 public:
  SkyOcclusionMapJs() : impl_(make_dep<Lazy<SkyOcclusionMap>>()) {}

  auto storage_size() const {
    return impl_->get().storage_size();
  }

  auto load_shard(Vec3i pos, BufferJs<uint8_t>& buffer) {
    auto tensor = tensors::make_tensor<uint8_t>(tensors::kChunkShape);
    transport::from_blob(tensor, buffer.data(), buffer.size());
    impl_->get().chunk(pos)->array = tensor.chunks[0]->array;
  }

  auto dump_shard(Vec3i pos, BufferJs<uint8_t>& buffer) {
    auto tensor = tensors::make_tensor(*impl_->get().chunk(pos));
    auto blob = transport::to_blob(tensor);
    buffer.resize(blob.size());
    std::copy(blob.begin(), blob.end(), buffer.data());
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<Lazy<SkyOcclusionMap>> impl_;
};

class SkyOcclusionStreamJs {
 public:
  SkyOcclusionStreamJs() : impl_(make_dep<SkyOcclusionStream>()) {}

  auto subscribe() const {
    return StreamReaderJs<Vec3i>(*impl_);
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  std::shared_ptr<SkyOcclusionStream> impl_;
};

class SkyOcclusionWriterJs {
 public:
  SkyOcclusionWriterJs(
      const LoggerJs& logger,
      const SkyOcclusionMapJs& map,
      const SkyOcclusionStreamJs& stream)
      : impl_(make_dep<SkyOcclusionWriter>(
            logger.impl(), map.impl(), stream.impl())) {}

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<SkyOcclusionWriter> impl_;
};

class IrradianceMapJs {
 public:
  IrradianceMapJs() : impl_(make_dep<Lazy<IrradianceMap>>()) {}

  auto storage_size() const {
    return impl_->get().storage_size();
  }

  auto load_shard(Vec3i pos, BufferJs<uint8_t>& buffer) {
    auto tensor = tensors::make_tensor<Vec4<uint8_t>>(tensors::kChunkShape);
    transport::from_blob(tensor, buffer.data(), buffer.size());
    impl_->get().chunk(pos)->array = tensor.chunks[0]->array;
  }

  auto dump_shard(Vec3i pos, BufferJs<uint8_t>& buffer) {
    auto tensor = tensors::make_tensor(*impl_->get().chunk(pos));
    auto blob = transport::to_blob(tensor);
    buffer.resize(blob.size());
    std::copy(blob.begin(), blob.end(), buffer.data());
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<Lazy<IrradianceMap>> impl_;
};

class IrradianceStreamJs {
 public:
  IrradianceStreamJs() : impl_(make_dep<IrradianceStream>()) {}

  auto subscribe() const {
    return StreamReaderJs<Vec3i>(*impl_);
  }

  const auto& impl() const {
    return impl_;
  }

 private:
  std::shared_ptr<IrradianceStream> impl_;
};

class IrradianceWriterJs {
 public:
  IrradianceWriterJs(
      const LoggerJs& logger,
      const IrradianceMapJs& map,
      const IrradianceStreamJs& stream)
      : impl_(make_dep<IrradianceWriter>(
            logger.impl(), map.impl(), stream.impl())) {}

  const auto& impl() const {
    return impl_;
  }

 private:
  Dep<IrradianceWriter> impl_;
};

class LightSimulationJs {
 public:
  LightSimulationJs(
      const LoggerJs& logger,
      const TerrainMapJs& terrain_map,
      const SkyOcclusionMapJs& sky_occlusion_map,
      const SkyOcclusionWriterJs& sky_occlusion_writer,
      const IrradianceMapJs& irradiance_map,
      const IrradianceWriterJs& irradiance_writer,
      const TerrainStreamJs& terrain_stream)
      : impl_(make_dep<LightSimulation>(
            logger.impl(),
            terrain_map.impl(),
            sky_occlusion_map.impl(),
            sky_occlusion_writer.impl(),
            irradiance_map.impl(),
            irradiance_writer.impl(),
            terrain_stream.impl())) {}

  void init() {
    impl_->init();
  }

  void tick() {
    impl_->tick();
  }

 private:
  Dep<LightSimulation> impl_;
};

template <typename T>
inline void bind_stream_reader(const char* name) {
  emscripten::class_<StreamReaderJs<T>>(name)
      .function("isOpen", &StreamReaderJs<T>::open)
      .function("isEmpty", &StreamReaderJs<T>::empty)
      .function("read", &StreamReaderJs<T>::read)
      .function("close", &StreamReaderJs<T>::close);
}

template <typename T>
inline void bind_world_map(const char* name) {
  emscripten::class_<WorldMap<T>>(name)
      .constructor(emscripten::optional_override(
          [](const voxels::Box& box, const tensors::Tensor<T>& tensor) {
            return WorldMap<T>{box, tensor};
          }))
      .property("aabb", &WorldMap<T>::aabb)
      .property("tensor", &WorldMap<T>::tensor)
      .function("get", &WorldMap<T>::get)
      .function(
          "chunk",
          emscripten::optional_override([](const WorldMap<T>& map, Vec3i pos) {
            return tensors::make_tensor(*map.chunk(pos));
          }));

  static const auto make_name = std::string{"make"} + name;
  emscripten::function(
      make_name.c_str(),
      emscripten::optional_override(
          [](const tensors::Tensor<T>& tensor, Vec3i offset) {
            voxels::Box aabb{offset, offset + to<int>(tensor.shape)};
            return WorldMap<T>{aabb, tensor};
          }));
}

class TerrainMapV2Js {
 public:
  TerrainMapV2Js(){};
  TerrainMapV2Js(TerrainMapV2&& map) : impl_{std::move(map)} {}

  auto aabb() const {
    return impl_.aabb();
  }

  bool contains(Vec3i pos) const {
    return impl_.contains(pos);
  }

  auto storage_size() const {
    return impl_.storage_size();
  }

  void update_diff(
      Vec3i pos, const biomes::js::SparseBlockJs<TerrainId>& block) {
    impl_.update_diff(
        pos, biomes::migration::tensor_from_sparse_block(block.impl()));
  };

  void update_water(Vec3i pos, const WaterChunk& water) {
    impl_.update_water(pos, water);
  }

  void update_irradiance(Vec3i pos, const IrradianceChunk& irradiance) {
    impl_.update_irradiance(pos, irradiance);
  }

  void update_dye(Vec3i pos, const DyeChunk& dye) {
    impl_.update_dye(pos, dye);
  }

  void update_growth(Vec3i pos, const GrowthChunk& growth) {
    impl_.update_growth(pos, growth);
  }

  void update_occlusion(Vec3i pos, const OcclusionChunk& occlusion) {
    impl_.update_occlusion(pos, occlusion);
  }

  const TerrainMapV2& impl() const {
    return impl_;
  }

 private:
  TerrainMapV2 impl_;
};

class TerrainMapBuilderV2Js {
 public:
  void assign_seed_volume_block(
      Vec3i pos, const biomes::js::VolumeBlockJs<TerrainId>& block) {
    impl_.assign_seed_block(
        pos, biomes::migration::tensor_from_volume_block(block.impl()));
  };
  void assign_seed_block(Vec3i pos, const galois::terrain::Tensor& block) {
    impl_.assign_seed_block(pos, block);
  };
  void assign_diff_block(
      Vec3i pos, const biomes::js::SparseBlockJs<TerrainId>& block) {
    impl_.assign_diff_block(
        pos, biomes::migration::tensor_from_sparse_block(block.impl()));
  };
  void assign_water_block(Vec3i pos, WaterChunk& water) {
    impl_.assign_water_block(pos, water);
  }
  void assign_irradiance_block(Vec3i pos, IrradianceChunk& irradiance) {
    impl_.assign_irradiance_block(pos, irradiance);
  }
  void assign_dye_block(Vec3i pos, DyeChunk& dye) {
    impl_.assign_dye_block(pos, dye);
  }
  auto assign_growth_block(Vec3i pos, GrowthChunk& growth) {
    impl_.assign_growth_block(pos, growth);
  }
  void assign_occlusion_block(Vec3i pos, OcclusionChunk& occlusion) {
    impl_.assign_occlusion_block(pos, occlusion);
  }
  auto aabb() {
    return impl_.aabb();
  }
  auto shard_count() {
    return impl_.shard_count();
  }
  auto hole_count() {
    return impl_.hole_count();
  }
  void build(TerrainMapV2Js& map) {
    map = std::move(impl_).build();
  }

 private:
  TerrainMapBuilderV2 impl_;
};

WorldMap<uint8_t> update_water(const TerrainMapV2Js& terrain, Vec3i chunk_pos) {
  return gaia::update_water(terrain.impl(), chunk_pos);
}

WorldMap<uint32_t> update_irradiance(
    const TerrainMapV2Js& terrain,
    Vec3i chunk_pos,
    const tensors::Tensor<uint32_t>& light_source_tensor) {
  return gaia::update_irradiance(
      terrain.impl(), chunk_pos, light_source_tensor);
}

WorldMap<uint8_t> update_occlusion(
    const TerrainMapV2Js& terrain, Vec2i column) {
  return gaia::update_occlusion(terrain.impl(), column);
}

inline void bind() {
  namespace em = emscripten;

  bind_stream_reader<Vec3i>("StreamReader_Vec3i");
  bind_world_map<uint8_t>("WorldMap_U8");
  bind_world_map<uint32_t>("WorldMap_U32");

  em::class_<LoggerJs>("GaiaLogger")
      .constructor<emscripten::val>()
      .function("log", &LoggerJs::log);

  em::class_<TerrainMapJs>("GaiaTerrainMap")
      .constructor()
      .function("aabb", &TerrainMapJs::aabb)
      .function("get", &TerrainMapJs::get)
      .function("getSeed", &TerrainMapJs::get_seed)
      .function("getDiff", &TerrainMapJs::get_diff)
      .function("find", &TerrainMapJs::find)
      .function("findSeed", &TerrainMapJs::find_seed)
      .function("findDiff", &TerrainMapJs::find_diff)
      .function("storageSize", &TerrainMapJs::storage_size);

  em::class_<TerrainMapBuilderJs>("GaiaTerrainMapBuilder")
      .constructor()
      .function("aabb", &TerrainMapBuilderJs::aabb)
      .function("assignSeed", &TerrainMapBuilderJs::assign_seed)
      .function("assignDiff", &TerrainMapBuilderJs::assign_diff)
      .function("assignDye", &TerrainMapBuilderJs::assign_dye)
      .function("build", &TerrainMapBuilderJs::build);

  em::class_<TerrainStreamJs>("GaiaTerrainStream")
      .constructor<>()
      .function("subscribe", &TerrainStreamJs::subscribe);

  em::class_<TerrainWriterJs>("GaiaTerrainWriter")
      .constructor<
          const LoggerJs&,
          const TerrainMapJs&,
          const TerrainStreamJs&>()
      .function("updateDiff", &TerrainWriterJs::update_diff)
      .function("updateDye", &TerrainWriterJs::update_dye);

  em::class_<SkyOcclusionMapJs>("GaiaSkyOcclusionMap")
      .constructor()
      .function("storageSize", &SkyOcclusionMapJs::storage_size)
      .function("loadShard", &SkyOcclusionMapJs::load_shard)
      .function("dumpShard", &SkyOcclusionMapJs::dump_shard);

  em::class_<SkyOcclusionStreamJs>("GaiaSkyOcclusionStream")
      .constructor<>()
      .function("subscribe", &SkyOcclusionStreamJs::subscribe);

  em::class_<SkyOcclusionWriterJs>("GaiaSkyOcclusionWriter")
      .constructor<
          const LoggerJs&,
          const SkyOcclusionMapJs&,
          const SkyOcclusionStreamJs&>();

  em::class_<IrradianceMapJs>("GaiaIrradianceMap")
      .constructor()
      .function("storageSize", &IrradianceMapJs::storage_size)
      .function("loadShard", &IrradianceMapJs::load_shard)
      .function("dumpShard", &IrradianceMapJs::dump_shard);

  em::class_<IrradianceStreamJs>("GaiaIrradianceStream")
      .constructor<>()
      .function("subscribe", &IrradianceStreamJs::subscribe);

  em::class_<IrradianceWriterJs>("GaiaIrradianceWriter")
      .constructor<
          const LoggerJs&,
          const IrradianceMapJs&,
          const IrradianceStreamJs&>();

  em::class_<LightSimulationJs>("GaiaLightSimulation")
      .constructor<
          const LoggerJs&,
          const TerrainMapJs&,
          const SkyOcclusionMapJs&,
          const SkyOcclusionWriterJs&,
          const IrradianceMapJs&,
          const IrradianceWriterJs&,
          const TerrainStreamJs&>()
      .function("init", &LightSimulationJs::init)
      .function("tick", &LightSimulationJs::tick);

  em::function(
      "updateMuckGradientWithSphere", gaia::update_muck_gradient_with_sphere);
  em::function(
      "updateMuckGradientWithAabb", gaia::update_muck_gradient_with_aabb);
  em::function("applyMuckGradient", gaia::apply_muck_gradient);
  em::function("updateWater", update_water);
  em::function("updateIrradiance", update_irradiance);
  em::function("updateOcclusion", update_occlusion);

  em::class_<TerrainMapV2Js>("GaiaTerrainMapV2")
      .constructor()
      .function("aabb", &TerrainMapV2Js::aabb)
      .function("contains", &TerrainMapV2Js::contains)
      .function("storageSize", &TerrainMapV2Js::storage_size)
      .function("updateDiff", &TerrainMapV2Js::update_diff)
      .function("updateWater", &TerrainMapV2Js::update_water)
      .function("updateIrradiance", &TerrainMapV2Js::update_irradiance)
      .function("updateDye", &TerrainMapV2Js::update_dye)
      .function("updateGrowth", &TerrainMapV2Js::update_growth)
      .function("updateOcclusion", &TerrainMapV2Js::update_occlusion);

  em::class_<TerrainMapBuilderV2Js>("GaiaTerrainMapBuilderV2")
      .constructor()
      .function("assignSeedTensor", &TerrainMapBuilderV2Js::assign_seed_block)
      .function("assignSeed", &TerrainMapBuilderV2Js::assign_seed_volume_block)
      .function("assignDiff", &TerrainMapBuilderV2Js::assign_diff_block)
      .function("assignWater", &TerrainMapBuilderV2Js::assign_water_block)
      .function(
          "assignIrradiance", &TerrainMapBuilderV2Js::assign_irradiance_block)
      .function("assignDye", &TerrainMapBuilderV2Js::assign_dye_block)
      .function("assignGrowth", &TerrainMapBuilderV2Js::assign_growth_block)
      .function(
          "assignOcclusion", &TerrainMapBuilderV2Js::assign_occlusion_block)
      .function("aabb", &TerrainMapBuilderV2Js::aabb)
      .function("shardCount", &TerrainMapBuilderV2Js::shard_count)
      .function("holeCount", &TerrainMapBuilderV2Js::hole_count)
      .function("build", &TerrainMapBuilderV2Js::build);
}

}  // namespace voxeloo::gaia::js

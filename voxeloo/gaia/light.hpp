#pragma once

#include <memory>
#include <unordered_map>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/gaia/deps.hpp"
#include "voxeloo/gaia/lazy.hpp"
#include "voxeloo/gaia/logger.hpp"
#include "voxeloo/gaia/maps.hpp"
#include "voxeloo/gaia/scanner.hpp"
#include "voxeloo/gaia/stream.hpp"
#include "voxeloo/gaia/terrain.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::gaia {

using SkyOcclusionMap = WorldMap<uint8_t>;
using SkyOcclusionStream = Stream<Vec3i>;

using IrradianceMap = WorldMap<Vec4<uint8_t>>;
using IrradianceStream = Stream<Vec3i>;

template <typename T>
using ChunkLayer = std::vector<uint16_t, T>;

class SkyOcclusionWriter {
 public:
  SkyOcclusionWriter(
      Dep<Logger> logger,
      Dep<Lazy<SkyOcclusionMap>> sky_occlusion_map,
      Dep<SkyOcclusionStream> sky_occlusion_stream)
      : logger_(std::move(logger)),
        map_(std::move(sky_occlusion_map)),
        stream_(sky_occlusion_stream) {}

  void update(Vec3i pos, tensors::Chunk<uint8_t> chunk);
  void signal(Vec3i pos);

 private:
  Dep<Logger> logger_;
  Dep<Lazy<SkyOcclusionMap>> map_;
  Dep<SkyOcclusionStream> stream_;
  ChecksumMap<uint8_t> checksums_;
};

class IrradianceWriter {
 public:
  IrradianceWriter(
      Dep<Logger> logger,
      Dep<Lazy<IrradianceMap>> irradiance_map,
      Dep<IrradianceStream> irradiance_stream)
      : logger_(std::move(logger)),
        map_(std::move(irradiance_map)),
        stream_(irradiance_stream) {}

  void update(Vec3i pos, tensors::Chunk<Vec4<uint8_t>> chunk);
  void signal(Vec3i pos);

 private:
  Dep<Logger> logger_;
  Dep<Lazy<IrradianceMap>> map_;
  Dep<IrradianceStream> stream_;
  ChecksumMap<Vec4<uint8_t>> checksums_;
};

class LightSimulation {
 public:
  LightSimulation(
      Dep<Logger> logger,
      Dep<Lazy<TerrainMap>> terrain_map,
      Dep<Lazy<SkyOcclusionMap>> sky_occlusion_map,
      Dep<SkyOcclusionWriter> sky_occlusion_writer,
      Dep<Lazy<IrradianceMap>> irradiance_map,
      Dep<IrradianceWriter> irradiance_writer,
      Dep<TerrainStream> terrain_stream)
      : logger_(std::move(logger)),
        terrain_(std::move(terrain_map)),
        sky_occlusion_map_(std::move(sky_occlusion_map)),
        sky_occlusion_writer_(std::move(sky_occlusion_writer)),
        irradiance_map_(std::move(irradiance_map)),
        irradiance_writer_(std::move(irradiance_writer)),
        subscription_(terrain_stream->subscribe()) {}

  void init();
  void tick();

 private:
  Dep<Logger> logger_;
  Dep<Lazy<TerrainMap>> terrain_;
  Dep<Lazy<SkyOcclusionMap>> sky_occlusion_map_;
  Dep<SkyOcclusionWriter> sky_occlusion_writer_;
  Dep<Lazy<IrradianceMap>> irradiance_map_;
  Dep<IrradianceWriter> irradiance_writer_;
  StreamReader<Vec3i> subscription_;
  Lazy<Scanner2> column_scanner_;
};

void process_sky_occlusion_queue(
    const TerrainMap& terrain,
    SkyOcclusionMap& sky_occlusion,
    SkyOcclusionWriter& signaler,
    Queue<Vec3i>& queue);

void process_irradiance_queue(
    const TerrainMap& terrain,
    IrradianceMap& irradiance,
    IrradianceWriter& signaler,
    Queue<Vec3i>& queue);

void process_irradiance_rgb_queue(
    const TerrainMap& terrain,
    IrradianceMap& irradiance,
    IrradianceWriter& signaler,
    Queue<Vec3i>& queue);

WorldMap<uint32_t> update_irradiance(
    const TerrainMapV2& map,
    Vec3i pos,
    const tensors::Tensor<uint32_t>& sources_tensor);
WorldMap<uint8_t> update_occlusion(const TerrainMapV2& map, Vec2i column);

struct Colour {
  Vec3<float> rgb{};
  float intensity{};

  uint32_t pack() const {
    auto rgb8 = rgb.to<uint8_t>();
    return (rgb8.x << 24) | (rgb8.y << 16) | (rgb8.z << 8) |
           static_cast<uint8_t>(intensity);
  }

  static Colour unpack(uint32_t x) {
    Vec3<uint8_t> rgb{
        static_cast<uint8_t>((x >> 24) & 0xff),
        static_cast<uint8_t>((x >> 16) & 0xff),
        static_cast<uint8_t>((x >> 8) & 0xff),
    };
    float intensity = static_cast<float>(x & 0xff);
    return Colour{to<float>(rgb), intensity};
  }

  bool operator==(const Colour&) const = default;
};

}  // namespace voxeloo::gaia

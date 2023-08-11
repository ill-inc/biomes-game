#include "voxeloo/gaia/light.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;        // NOLINT
using namespace voxeloo::gaia;  // NOLINT

TEST_CASE("Test the irradiance map update logic", "[all]") {
  auto terrain = [] {
    TerrainMapBuilder builder;
    builder.assign_seed_block(
        {0, 0, 0}, tensors::make_tensor<TerrainId>(tensors::kChunkShape, 0));
    builder.assign_seed_block(
        {0, 32, 0}, tensors::make_tensor<TerrainId>(tensors::kChunkShape, 64));
    return std::move(builder).build();
  }();

  auto irradiance = [] {
    auto ret = make_dep<Lazy<IrradianceMap>>();
    ret->set({
        {{0, 0, 0}, {32, 64, 32}},
        tensors::make_tensor<Vec4<uint8_t>>(
            {32u, 64u, 32u}, Vec4<uint8_t>{0, 0, 0, 0}),
    });
    return ret;
  }();

  auto writer = [&] {
    auto logger = make_dep<Logger>([](const std::string& msg) {});
    auto stream = make_dep<IrradianceStream>();
    return make_dep<IrradianceWriter>(logger, irradiance, stream);
  }();

  Queue<Vec3i> queue;
  queue.push({15, 32, 15});
  process_irradiance_rgb_queue(terrain, irradiance->get(), *writer, queue);

  auto& im = irradiance->get();
  for (int y = 0; y < 32; y += 1) {
    auto intensity = static_cast<uint8_t>(std::max(0, 15 - y));
    auto value = im.get({15, 32 - y, 15});
    REQUIRE(value == Vec4<uint8_t>{intensity, intensity, intensity, 0});
  }
}
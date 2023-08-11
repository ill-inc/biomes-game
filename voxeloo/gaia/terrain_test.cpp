#include "voxeloo/gaia/terrain.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;  // NOLINT
using galois::terrain::TerrainId;

TEST_CASE("Test the terrain map", "[all]") {
  auto map = [] {
    gaia::TerrainMapBuilder builder;
    builder.assign_seed_block(
        {0, 0, 0}, tensors::make_tensor<TerrainId>(tensors::kChunkShape, 1));
    builder.assign_seed_block(
        {32, 0, 0}, tensors::make_tensor<TerrainId>(tensors::kChunkShape, 2));
    builder.assign_seed_block(
        {64, 0, 0}, tensors::make_tensor<TerrainId>(tensors::kChunkShape, 3));
    builder.assign_diff_block(
        {32, 0, 0},
        tensors::make_tensor<std::optional<TerrainId>>(
            tensors::kChunkShape, 4));
    return std::move(builder).build();
  }();

  REQUIRE(map.get({13, 10, 9}) == 1);
  REQUIRE(map.get({33, 10, 9}) == 4);
  REQUIRE(map.get({64, 10, 9}) == 3);

  REQUIRE(map.get_seed({13, 10, 9}) == 1);
  REQUIRE(map.get_seed({33, 10, 9}) == 2);
  REQUIRE(map.get_seed({64, 10, 9}) == 3);

  REQUIRE(!map.get_diff({13, 10, 9}).has_value());
  REQUIRE(!map.get_diff({64, 10, 9}).has_value());
  REQUIRE(map.get_diff({33, 10, 9}) == 4);
}

TEST_CASE("Test sub world map extraction", "[all]") {
  auto tensor = map_chunks(
      tensors::make_tensor({96, 96, 96}, 0), [&](int i, Vec3u pos, auto _) {
        return tensors::make_chunk(i);
      });

  auto map = gaia::WorldMap<int>{{{0, 0, 0}, {96, 96, 96}}, tensor};

  {
    auto sub = gaia::sub_world_map(map, {{0, 0, 0}, {32, 32, 32}});
    REQUIRE(sub.tensor.shape == Vec3u{32, 32, 32});
    REQUIRE(sub.get({0, 0, 0}) == 0);
  }

  {
    auto sub = gaia::sub_world_map(map, {{32, 0, 0}, {64, 32, 32}});
    REQUIRE(sub.tensor.shape == Vec3u{32, 32, 32});
    REQUIRE(sub.get({32, 0, 0}) == 1);
  }

  {
    auto sub = gaia::sub_world_map(map, {{0, 32, 0}, {32, 64, 32}});
    REQUIRE(sub.tensor.shape == Vec3u{32, 32, 32});
    REQUIRE(sub.get({0, 32, 0}) == 3);
  }

  {
    auto sub = gaia::sub_world_map(map, {{0, 0, 32}, {32, 32, 64}});
    REQUIRE(sub.tensor.shape == Vec3u{32, 32, 32});
    REQUIRE(sub.get({0, 0, 32}) == 9);
  }

  {
    auto sub = gaia::sub_world_map(map, {{0, 0, 0}, {64, 64, 64}});
    REQUIRE(sub.tensor.shape == Vec3u{64, 64, 64});
    REQUIRE(sub.get({0, 0, 0}) == 0);
    REQUIRE(sub.get({32, 0, 0}) == 1);
    REQUIRE(sub.get({0, 32, 0}) == 3);
    REQUIRE(sub.get({0, 0, 32}) == 9);
    REQUIRE(sub.get({0, 32, 32}) == 12);
    REQUIRE(sub.get({32, 32, 32}) == 13);
  }
}
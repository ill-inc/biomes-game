#include <catch2/catch.hpp>
#include <tuple>
#include <vector>

#include "voxeloo/biomes/biomes.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/transport.hpp"

using Catch::Matchers::UnorderedEquals;

namespace voxeloo {

TEST_CASE("Test shard encode / decode routines", "[all]") {
  using shards::shard_decode;
  using shards::shard_encode;
  using shards::ShardPos;

  REQUIRE(ShardPos{0, {1, 2, 3}} == shard_decode(shard_encode({0, {1, 2, 3}})));
  REQUIRE(
      ShardPos{1, {1230, 0, 26656}} ==
      shard_decode(shard_encode({1, {1230, 0, 26656}})));
  REQUIRE(
      ShardPos{31, {-99'999, 0, -36656}} ==
      shard_decode(shard_encode({31, {-99'999, 0, -36656}})));
  REQUIRE(
      ShardPos{2, {-99'999, -1, 88'888}} ==
      shard_decode(shard_encode({2, {-99'999, -1, 88'888}})));
}

TEST_CASE("Test shard coordinate routines", "[all]") {
  auto [shard, local] = shards::block_partition({-1, -3, 2});

  REQUIRE(shard == vec3(-1, -1, 0));
  REQUIRE(local == vec3(31u, 29u, 2u));
}

}  // namespace voxeloo
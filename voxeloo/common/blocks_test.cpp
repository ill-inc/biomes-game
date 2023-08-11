#include "voxeloo/common/blocks.hpp"

#include <catch2/catch.hpp>
#include <limits>

#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/meshes.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo {
using namespace colors;

using Catch::Detail::Approx;
using Catch::Matchers::Equals;

auto extract_positions(const std::vector<meshes::Vertex>& vertices) {
  std::vector<Vec3i> ret;
  for (const auto& vertex : vertices) {
    ret.push_back(vertex.xyz.to<int>());
  }
  return ret;
}

TEST_CASE("Test block coordinate operations", "[all]") {
  using namespace blocks;
  {
    auto [hi, lo] = key(1, 2, 3);
    REQUIRE(lo == 0x302001);
    REQUIRE(hi == 0x0);
  }
  {
    auto [hi, lo] = key(1, 2, 3);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == 1);
    REQUIRE(y == 2);
    REQUIRE(z == 3);
  }
  {
    auto [hi, lo] = key(-1, -2, -3);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == -1);
    REQUIRE(y == -2);
    REQUIRE(z == -3);
  }
  {
    auto [hi, lo] = key(0, 0, 0);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == 0);
    REQUIRE(y == 0);
    REQUIRE(z == 0);
  }
  {
    auto [hi, lo] = key(-12312312, 32498034, -123123);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == -12312312);
    REQUIRE(y == 32498034);
    REQUIRE(z == -123123);
  }
  {
    auto max_i = std::numeric_limits<int32_t>::min();
    auto min_i = std::numeric_limits<int32_t>::max();
    auto [hi, lo] = key(max_i, min_i, max_i);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == max_i);
    REQUIRE(y == min_i);
    REQUIRE(z == max_i);
  }
  {
    auto max_i = std::numeric_limits<int32_t>::min();
    auto min_i = std::numeric_limits<int32_t>::max();
    auto [hi, lo] = key(min_i, max_i, min_i);
    auto [x, y, z] = pos(hi, lo);
    REQUIRE(x == min_i);
    REQUIRE(y == max_i);
    REQUIRE(z == min_i);
  }
}

TEST_CASE("Test block builder routines", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 2, 3, red());
    builder.add(4, 5, 6, blue());
    builder.add(-2, -5, -1, green());
    return std::move(builder).build();
  }();

  blocks::BlockReader<RGBA> reader(block_list);
  REQUIRE(reader.get_or(1, 2, 3, black()) == red());
  REQUIRE(reader.get_or(4, 5, 6, black()) == blue());
  REQUIRE(reader.get_or(-2, -5, -1, black()) == green());
  REQUIRE(!reader.has(0, 2, 3));
  REQUIRE(!reader.has(2, 2, 3));
  REQUIRE(!reader.has(1, 1, 3));
  REQUIRE(!reader.has(1, 3, 3));
  REQUIRE(!reader.has(1, 2, 2));
  REQUIRE(!reader.has(1, 2, 4));
}

TEST_CASE("Test block map routine", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 2, 3, red());
    builder.add(4, 5, 6, blue());
    builder.add(-2, -5, -1, green());
    return std::move(builder).build();
  }();

  block_list = map(block_list, [](int x, int y, int z, ATTR_UNUSED RGBA _) {
    std::optional<RGBA> ret;
    if (std::tuple(x, y, z) == std::tuple(1, 2, 3)) {
      ret = white();
    }
    return ret;
  });

  blocks::BlockReader<RGBA> reader(block_list);
  REQUIRE(reader.get_or(1, 2, 3, black()) == white());
  REQUIRE(!reader.has(4, 5, 6));
  REQUIRE(!reader.has(-2, -5, -1));
}

TEST_CASE("Test block crop routine", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    for (int z = 0; z <= 2; z += 1) {
      for (int y = 0; y <= 2; y += 1) {
        for (int x = 0; x <= 2; x += 1) {
          builder.add(x, y, z, white());
        }
      }
    }
    return std::move(builder).build();
  }();

  block_list = crop(block_list, {{1, 1, 1}, {2, 2, 2}});

  blocks::BlockReader<RGBA> reader(block_list);
  REQUIRE(reader.get_or(1, 1, 1, black()) == white());
  for (int z = 0; z <= 2; z += 1) {
    for (int y = 0; y <= 2; y += 1) {
      for (int x = 0; x <= 2; x += 1) {
        if (x == 1 && y == 1 && z == 1) {
          continue;
        }
        REQUIRE(!reader.has(x, y, z));
      }
    }
  }
}

TEST_CASE("Test block serialization routines", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 2, 3, red());
    builder.add(4, 5, 6, blue());
    return std::move(builder).build();
  }();

  // Encode the BlockList to a blob.
  auto blob = transport::to_compressed_blob(block_list);

  // Decode the blob to a BlockList.
  auto decoded = transport::from_compressed_blob<blocks::BlockList<RGBA>>(blob);

  // Make sure the input and output blobs match.
  REQUIRE(block_list.scale == decoded.scale);
  REQUIRE(block_list.blocks.size() == decoded.blocks.size());
  for (size_t i = 0; i < block_list.blocks.size(); i += 1) {
    const auto& [si, sb] = block_list.blocks.at(i);
    const auto& [di, db] = decoded.blocks.at(i);
    REQUIRE(si == di);
    REQUIRE_THAT(sb, Equals(db));
  }
}

TEST_CASE("Test block mesh generation routines", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 1, 1, red());
    return std::move(builder).build();
  }();

  blocks::BlockReader<RGBA> reader(block_list);
  REQUIRE(reader.has(1, 1, 1));
  REQUIRE(reader.get_or(1, 1, 1, black()) == red());

  auto mesh = meshes::emit_mesh(block_list);
  REQUIRE(mesh.vertices.size() == 4 * 6);
  REQUIRE(mesh.indices.size() == 6 * 6);
  REQUIRE_THAT(
      extract_positions(mesh.vertices),
      Catch::Matchers::UnorderedEquals(std::vector<Vec3i>{
          // X_NEG
          {1, 1, 1},
          {1, 1, 2},
          {1, 2, 2},
          {1, 2, 1},

          // X_POS
          {2, 1, 2},
          {2, 1, 1},
          {2, 2, 1},
          {2, 2, 2},

          // Y_NEG
          {1, 1, 1},
          {2, 1, 1},
          {2, 1, 2},
          {1, 1, 2},

          // Y_POS
          {1, 2, 1},
          {1, 2, 2},
          {2, 2, 2},
          {2, 2, 1},

          // Z_NEG
          {1, 1, 1},
          {1, 2, 1},
          {2, 2, 1},
          {2, 1, 1},

          // Z_POS
          {1, 1, 2},
          {2, 1, 2},
          {2, 2, 2},
          {1, 2, 2},
      }));
}

TEST_CASE("Test axis-aligned bounding box routine", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 1, 1, red());
    builder.add(2, 2, 2, blue());
    builder.add(3, 2, 4, green());
    return std::move(builder).build();
  }();

  auto aabb = blocks::bounding_box(block_list);
  REQUIRE(aabb.v0[0] == 1);
  REQUIRE(aabb.v0[1] == 1);
  REQUIRE(aabb.v0[2] == 1);
  REQUIRE(aabb.v1[0] == 4);
  REQUIRE(aabb.v1[1] == 3);
  REQUIRE(aabb.v1[2] == 5);
}

TEST_CASE("Test center of mass routine", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 1, 1, red());
    builder.add(2, 2, 2, blue());
    builder.add(3, 2, 4, green());
    return std::move(builder).build();
  }();

  auto center = blocks::center_of_mass(block_list);
  REQUIRE(center[0] == Approx(7.5 / 3));
  REQUIRE(center[1] == Approx(6.5 / 3));
  REQUIRE(center[2] == Approx(8.5 / 3));
}

TEST_CASE("Test marching a ray through blocks", "[all]") {
  auto block_list = [] {
    blocks::BlockBuilder<RGBA> builder(1.0f);
    builder.add(1, 1, 0, red());
    builder.add(2, 1, 0, blue());
    builder.add(2, 2, 0, green());
    return std::move(builder).build();
  }();

  std::vector<std::tuple<Vec3i, std::optional<RGBA>>> out;
  blocks::march(
      block_list,
      {0.0f, 0.0f, 0.0f},
      {2.0f, 1.8f, 0.0f},
      100.0f,
      [&](int x, int y, int z, std::optional<RGBA> rgba) {
        if (out.size() < 5) {
          out.emplace_back(Vec3i{x, y, z}, rgba);
          return true;
        }
        return false;
      });

  REQUIRE(out.size() == 5);
  REQUIRE(std::get<0>(out[0]) == Vec3i{0, 0, 0});
  REQUIRE(std::get<0>(out[1]) == Vec3i{1, 0, 0});
  REQUIRE(std::get<0>(out[2]) == Vec3i{1, 1, 0});
  REQUIRE(std::get<0>(out[3]) == Vec3i{2, 1, 0});
  REQUIRE(std::get<0>(out[4]) == Vec3i{2, 2, 0});
  REQUIRE(!std::get<1>(out[0]).has_value());
  REQUIRE(!std::get<1>(out[1]).has_value());
  REQUIRE(std::get<1>(out[2]).value() == red());
  REQUIRE(std::get<1>(out[3]).value() == blue());
  REQUIRE(std::get<1>(out[4]).value() == green());
}

}  // namespace voxeloo
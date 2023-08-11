#include "voxeloo/biomes/biomes.hpp"

#include <catch2/catch.hpp>
#include <tuple>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/transport.hpp"

using Catch::Matchers::UnorderedEquals;
using voxeloo::Vec3;
using voxeloo::vec3;
using voxeloo::Vec3i;
using voxeloo::biomes::AABB;
using voxeloo::biomes::BiomesVertex;
using voxeloo::biomes::intersect_ray_aabb;
using voxeloo::biomes::Material;
using voxeloo::biomes::SparseBlock;
using voxeloo::biomes::SparseMap;
using voxeloo::biomes::SparseTable;
using voxeloo::biomes::VolumeBlock;
using voxeloo::biomes::VolumeMap;
using voxeloo::transport::Blob;
using voxeloo::transport::from_blob;
using voxeloo::transport::to_blob;
using voxeloo::voxels::Dir;

template <typename Val>
inline auto extract(const SparseBlock<Val>& block) {
  std::vector<std::tuple<Vec3<uint32_t>, Val>> ret;
  block.scan([&](uint32_t x, uint32_t y, uint32_t z, Val val) {
    ret.emplace_back(vec3(x, y, z), val);
  });
  return ret;
}

template <typename Val>
inline auto extract(const VolumeBlock<Val>& block) {
  std::vector<std::tuple<Vec3<uint32_t>, Val>> ret;
  block.scan([&](uint32_t x, uint32_t y, uint32_t z, Val val) {
    ret.emplace_back(vec3(x, y, z), val);
  });
  return ret;
}

template <typename Val>
inline auto extract(const SparseMap<Val>& map) {
  std::vector<std::tuple<Vec3i, Val>> ret;
  map.scan([&](int x, int y, int z, Val val) {
    ret.emplace_back(vec3(x, y, z), val);
  });
  return ret;
}

template <typename Val>
inline auto extract(const VolumeMap<Val>& map) {
  std::vector<std::tuple<Vec3i, Val>> ret;
  map.scan([&](int x, int y, int z, Val val) {
    ret.emplace_back(vec3(x, y, z), val);
  });
  return ret;
};

inline auto extract_positions(const std::vector<BiomesVertex>& vertices) {
  std::vector<Vec3i> ret;
  for (const auto& vertex : vertices) {
    ret.push_back(vertex.pos.to<int>());
  }
  return ret;
};

TEST_CASE("Test sparse block mesh generation", "[all]") {
  SparseBlock<Material> block;
  block.set(0, 0, 0, 1);
  block.set(1, 0, 0, 1);
  block.set(0, 1, 0, 1);
  block.set(1, 1, 0, 1);
  block.set(0, 0, 1, 1);
  block.set(1, 0, 1, 1);
  block.set(0, 1, 1, 1);
  block.set(1, 1, 1, 1);

  auto mesh =
      to_biomes_mesh(block, {0, 0, 0}, [](Material mat, ATTR_UNUSED Dir dir) {
        return mat;
      });
  REQUIRE_THAT(
      extract_positions(mesh.vertices),
      UnorderedEquals(std::vector<Vec3i>{
          // X_NEG
          {0, 0, 0},
          {0, 0, 2},
          {0, 2, 2},
          {0, 2, 0},

          // X_POS
          {2, 0, 2},
          {2, 0, 0},
          {2, 2, 0},
          {2, 2, 2},

          // Y_NEG
          {0, 0, 0},
          {2, 0, 0},
          {2, 0, 2},
          {0, 0, 2},

          // Y_POS
          {0, 2, 0},
          {0, 2, 2},
          {2, 2, 2},
          {2, 2, 0},

          // Z_NEG
          {0, 0, 0},
          {0, 2, 0},
          {2, 2, 0},
          {2, 0, 0},

          // Z_POS
          {0, 0, 2},
          {2, 0, 2},
          {2, 2, 2},
          {0, 2, 2},
      }));
}

TEST_CASE("Test volume block mesh generation", "[all]") {
  VolumeBlock<Material> block;
  block.set(0, 0, 0, 1);
  block.set(1, 0, 0, 1);
  block.set(0, 1, 0, 1);
  block.set(1, 1, 0, 1);
  block.set(0, 0, 1, 1);
  block.set(1, 0, 1, 1);
  block.set(0, 1, 1, 1);
  block.set(1, 1, 1, 1);

  auto mesh =
      to_biomes_mesh(block, {0, 0, 0}, [](Material mat, ATTR_UNUSED Dir dir) {
        return mat;
      });
  REQUIRE_THAT(
      extract_positions(mesh.vertices),
      UnorderedEquals(std::vector<Vec3i>{
          // X_NEG
          {0, 0, 0},
          {0, 0, 2},
          {0, 2, 2},
          {0, 2, 0},

          // X_POS
          {2, 0, 2},
          {2, 0, 0},
          {2, 2, 0},
          {2, 2, 2},

          // Y_NEG
          {0, 0, 0},
          {2, 0, 0},
          {2, 0, 2},
          {0, 0, 2},

          // Y_POS
          {0, 2, 0},
          {0, 2, 2},
          {2, 2, 2},
          {2, 2, 0},

          // Z_NEG
          {0, 0, 0},
          {0, 2, 0},
          {2, 2, 0},
          {2, 0, 0},

          // Z_POS
          {0, 0, 2},
          {2, 0, 2},
          {2, 2, 2},
          {0, 2, 2},
      }));
}

TEST_CASE("Test sparse block serialization", "[all]") {
  SparseBlock<int> block;
  block.set(0, 3, 5, -1);
  block.set(1, 0, 0, 4);
  block.set(17, 31, 0, 17);

  auto out = from_blob<SparseBlock<int>>(to_blob(block));
  REQUIRE_THAT(
      extract(out),
      UnorderedEquals(std::vector<std::tuple<Vec3<uint32_t>, int>>{
          {{0, 3, 5}, -1},
          {{1, 0, 0}, 4},
          {{17, 31, 0}, 17},
      }));
};

TEST_CASE("Test volume block serialization", "[all]") {
  VolumeBlock<int> block;
  block.set(0, 3, 5, -1);
  block.set(1, 0, 0, 4);
  block.set(17, 31, 0, 17);

  auto out = from_blob<VolumeBlock<int>>(to_blob(block));
  REQUIRE_THAT(
      extract(out),
      UnorderedEquals(std::vector<std::tuple<Vec3<uint32_t>, int>>{
          {{0, 3, 5}, -1},
          {{1, 0, 0}, 4},
          {{17, 31, 0}, 17},
      }));
};

TEST_CASE("Test sparse map serialization", "[all]") {
  SparseMap<int> map;
  map.set(0, -3, 5, -1);
  map.set(9, 0, 0, 4);
  map.set(17344124, -3124121, 0, 17);

  auto out = from_blob<SparseMap<int>>(to_blob(map));
  REQUIRE_THAT(
      extract(out),
      UnorderedEquals(std::vector<std::tuple<Vec3i, int>>{
          {{0, -3, 5}, -1},
          {{9, 0, 0}, 4},
          {{17344124, -3124121, 0}, 17},
      }));
};

TEST_CASE("Test volume map serialization", "[all]") {
  VolumeMap<int> map;
  map.set(0, -3, 5, -1);
  map.set(9, 0, 0, 4);
  map.set(17344124, -3124121, 0, 17);

  auto out = from_blob<VolumeMap<int>>(to_blob(map));
  REQUIRE_THAT(
      extract(out),
      UnorderedEquals(std::vector<std::tuple<Vec3i, int>>{
          {{0, -3, 5}, -1},
          {{9, 0, 0}, 4},
          {{17344124, -3124121, 0}, 17},
      }));
};

TEST_CASE("Test sparse table", "[all]") {
  SparseTable<std::string> table;

  table.set(0, 0, 0, "a");
  table.set(1, 2, 3, "a");
  table.set(1, 2, 3, "b");
  table.set(3, 6, 5, "a");
  table.set(19, 12, 3, "a");
  table.set(19, 12, 3, "b");
  table.del(0, 0, 0);
  table.del(3, 6, 5);
  table.set(4, 2, 1, "a");

  REQUIRE(table.size() == 3);
  REQUIRE(table.get(4, 2, 1) == "a");
  REQUIRE(table.get(1, 2, 3) == "b");
  REQUIRE(table.get(19, 12, 3) == "b");

  Blob blob = to_blob(table);
  SparseTable<std::string> table2;
  from_blob(table2, blob);
  REQUIRE(table.size() == 3);
  REQUIRE(table.get(4, 2, 1) == "a");
  REQUIRE(table.get(1, 2, 3) == "b");
  REQUIRE(table.get(19, 12, 3) == "b");
};

TEST_CASE("Test intersect_ray_aabb()", "[all]") {
  AABB aabb = {{1.f, 0.f, 1.f}, {2.f, 1.f, 2.f}};
  REQUIRE(intersect_ray_aabb({0.f, 0.f, 0.f}, {1.f, 1.f, 1.f}, aabb));
  REQUIRE(!intersect_ray_aabb({0.f, 0.f, 0.f}, {-1.f, 1.f, 1.f}, aabb));
};

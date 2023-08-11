#include <catch2/catch.hpp>
#include <random>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/galois/blocks.hpp"
#include "voxeloo/galois/florae.hpp"
#include "voxeloo/galois/groups.hpp"
#include "voxeloo/galois/muck.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/galois/terrain.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

using namespace voxeloo;          // NOLINT
using namespace voxeloo::galois;  // NOLINT

TEST_CASE("Test terrain tensors", "[all]") {
  auto tensor = [] {
    tensors::SparseChunkBuilder<terrain::TerrainId> builder;
    builder.set({0, 0, 0}, terrain::from_block_id(1));
    builder.set({0, 1, 0}, terrain::from_flora_id(3));
    builder.set({2, 0, 0}, terrain::from_flora_id(2));
    builder.set({0, 3, 3}, terrain::from_block_id(7));
    return tensors::make_tensor(std::move(builder).build());
  }();

  auto count_nonzero = [](auto& tensor) {
    auto ret = 0;
    tensors::scan_sparse(tensor, [&](auto pos, auto val) {
      ret += 1;
    });
    return ret;
  };

  auto blocks = terrain::to_blocks(tensor);
  REQUIRE(count_nonzero(blocks) == 2);
  REQUIRE(blocks.get(0, 0, 0) == 1);
  REQUIRE(blocks.get(0, 3, 3) == 7);

  auto florae = terrain::to_florae(tensor);
  REQUIRE(count_nonzero(florae) == 2);
  REQUIRE(florae.get(0, 1, 0) == 3);
  REQUIRE(florae.get(2, 0, 0) == 2);
}

TEST_CASE("Test flora", "[all]") {
  auto to_quad = [](float x, float texture) {
    return florae::Quads{
        {
            florae::QuadVertex{{x, x, x}, {1, 0, 0}, {0, 0}, texture, 0},
            florae::QuadVertex{{x, x, x}, {1, 0, 0}, {1, 0}, texture, 0},
            florae::QuadVertex{{x, x, x}, {1, 0, 0}, {1, 1}, texture, 0},
            florae::QuadVertex{{x, x, x}, {1, 0, 0}, {0, 1}, texture, 0},
        },
        {0, 1, 2, 0, 2, 3}};
  };

  auto index = [&] {
    florae::IndexBuilder builder;
    builder.add_samples(
        1,
        {{1, {"none", "none"}}, {2, {"none", "none"}}, {3, {"none", "none"}}});
    builder.add_samples(
        2,
        {{2, {"none", "none"}}, {4, {"none", "none"}}, {5, {"none", "none"}}});

    builder.add_quads(1, to_quad(1.0f, 1));
    builder.add_quads(2, to_quad(2.0f, 2));
    builder.add_quads(3, to_quad(3.0f, 3));
    builder.add_quads(4, to_quad(4.0f, 4));
    builder.add_quads(5, to_quad(5.0f, 5));

    return builder.build();
  }();

  REQUIRE(index.quads.size() == 6);
  REQUIRE(index.quads[1].vertices[0].pos.x == 1.0f);
  REQUIRE(index.quads[1].indices == std::vector<uint32_t>{0, 1, 2, 0, 2, 3});
  REQUIRE(index.quads[2].vertices[0].pos.x == 2.0f);
  REQUIRE(index.quads[2].indices == std::vector<uint32_t>{0, 1, 2, 0, 2, 3});
  REQUIRE(index.quads[3].vertices[0].pos.x == 3.0f);
  REQUIRE(index.quads[3].indices == std::vector<uint32_t>{0, 1, 2, 0, 2, 3});
  REQUIRE(index.quads[4].vertices[0].pos.x == 4.0f);
  REQUIRE(index.quads[4].indices == std::vector<uint32_t>{0, 1, 2, 0, 2, 3});
  REQUIRE(index.quads[5].vertices[0].pos.x == 5.0f);
  REQUIRE(index.quads[5].indices == std::vector<uint32_t>{0, 1, 2, 0, 2, 3});

  // Use the index to test meshing.
  auto tensor = [] {
    tensors::SparseChunkBuilder<uint32_t> builder;
    builder.set({0, 0, 0}, 1);
    builder.set({2, 1, 0}, 1);
    builder.set({2, 1, 3}, 1);
    builder.set({3, 2, 4}, 2);
    return tensors::make_tensor(std::move(builder).build());
  }();

  auto geometry = florae::to_geometry(
      tensor,
      tensors::make_tensor<florae::Growth>(tensor.shape, 0u),
      tensors::make_tensor<muck::Muck>(tensor.shape, 0u),
      index);

  // Use the index to test serde.
  florae::Index cloned;
  cloned.load(index.save());

  REQUIRE(index.samples.size() == cloned.samples.size());
  REQUIRE(index.samples.get(0) == cloned.samples.get(0));
}

TEST_CASE("Test sbo", "[all]") {
  std::vector<uint32_t> data;
  data.push_back(1);
  data.push_back(2);
  data.push_back(3);
  data.push_back(4);
  data.push_back(5);

  auto sbo = sbo::to_sbo(data);
  REQUIRE(sbo.shape == vec2(1u, 5u));
  REQUIRE(sbo.bytes() == 20);
  REQUIRE(sbo.data[0] == 1);
  REQUIRE(sbo.data[1] == 2);
  REQUIRE(sbo.data[2] == 3);
  REQUIRE(sbo.data[3] == 4);
  REQUIRE(sbo.data[4] == 5);
}

TEST_CASE("Test block sampling", "[all]") {
  using namespace blocks;  // NOLINT

  IndexBuilder builder(2, 0);
  uint16_t error_offset = 1;
  builder.add_block(0, {{{"white", 0, "none", "zero"}, error_offset}});
  builder.add_block(
      1,
      {
          {{"black", 3, "none", "moderate"}, 2},
          {{"black", 1, "none", "full"}, 3},
          {{"black", 2, "none", "any"}, 4},
          {{"white", 0, "none", "any"}, 5},
      });

  auto index = builder.build();
  REQUIRE(get_samples(index, 0, 0).offsets[0] == error_offset);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              3,
              MuckLevel::None,
              MoistureLevel::Zero))
          .offsets[0] == error_offset);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              3,
              MuckLevel::None,
              MoistureLevel::Moderate))
          .offsets[0] == 2);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              1,
              MuckLevel::None,
              MoistureLevel::Moderate))
          .offsets[0] == error_offset);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              1,
              MuckLevel::None,
              MoistureLevel::Full))
          .offsets[0] == 3);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              2,
              MuckLevel::None,
              MoistureLevel::Zero))
          .offsets[0] == 4);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              2,
              MuckLevel::None,
              MoistureLevel::Moderate))
          .offsets[0] == 4);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::Black,
              2,
              MuckLevel::None,
              MoistureLevel::Full))
          .offsets[0] == 4);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::White,
              0,
              MuckLevel::None,
              MoistureLevel::Moderate))
          .offsets[0] == 5);
  REQUIRE(
      get_samples(
          index,
          1,
          encode_criteria(
              CheckboardPosition::White,
              0,
              MuckLevel::None,
              MoistureLevel::Full))
          .offsets[0] == 5);
}

TEST_CASE("Test flora sampling", "[all]") {
  using namespace florae;  // NOLINT

  IndexBuilder builder;
  builder.set_fallback(1);
  builder.add_samples(0, {{1, {"seed", "none"}}, {2, {"wilted", "none"}}});
  builder.add_samples(1, {{3, {"none", "none"}}});
  builder.add_samples(4, {{4, {"none", "none"}}});
  builder.add_quads(1, {});

  auto index = builder.build();
  REQUIRE(sample_flora(index, 0, 0, 0, {}) == 3);
  REQUIRE(sample_flora(index, 0, 1, 0, {}) == 1);
  REQUIRE(sample_flora(index, 0, 2, 0, {}) == 3);
  REQUIRE(sample_flora(index, 0, 5, 0, {}) == 2);
  REQUIRE(sample_flora(index, 1, 0, 0, {}) == 3);
  REQUIRE(sample_flora(index, 1, 1, 0, {}) == 3);
  REQUIRE(sample_flora(index, 1, 4, 0, {}) == 3);
  REQUIRE(sample_flora(index, 1, 5, 0, {}) == 3);
  REQUIRE(
      index.samples.get(encode_criteria(4, GrowthLevel::None, MuckLevel::None))
          .count == 1);
}

TEST_CASE("Test large group tensor building and serde", "[all]") {
  using namespace groups;  // NOLINT

  const uint32_t dim = 50;

  auto get_id = [&](Vec3u pos) {
    return 1 + pos.x + dim * pos.y + dim * dim * pos.z;
  };

  TensorBuilder builder;
  for (uint32_t i = 0; i < dim; ++i) {
    for (uint32_t j = 0; j < dim; ++j) {
      for (uint32_t k = 0; k < dim; ++k) {
        Vec3u pos{i, j, k};
        builder.set_block(pos, get_id(pos), 0, 0, 0);
      }
    }
  }

  auto tensor = builder.build();
  for (uint32_t i = 0; i < dim; ++i) {
    for (uint32_t j = 0; j < dim; ++j) {
      for (uint32_t k = 0; k < dim; ++k) {
        Vec3u pos{i, j, k};
        REQUIRE(tensor.get(pos).block.block_id == get_id(pos));
      }
    }
  }

  auto saved = tensor.save();
  Tensor loaded;
  loaded.load(saved);
  size_t count = 0;
  loaded.scan([&](auto pos, auto entry) {
    ++count;
    REQUIRE(get_id(pos) == entry.block.block_id);
  });
  REQUIRE(count == dim * dim * dim);
}
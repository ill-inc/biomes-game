#include "voxeloo/tensors/tensors.hpp"

#include <catch2/catch.hpp>

#include "sparse.hpp"
#include "voxeloo/common/geometry.hpp"

using namespace voxeloo;           // NOLINT
using namespace voxeloo::tensors;  // NOLINT

TEST_CASE("Test tensors", "[all]") {
  auto a = make_chunk('a');
  REQUIRE(a.get(0, 0, 0) == 'a');
  REQUIRE(a.get(31, 0, 0) == 'a');
  REQUIRE(a.get(0, 31, 0) == 'a');
  REQUIRE(a.get(0, 0, 31) == 'a');
  REQUIRE(a.get(6, 6, 6) == 'a');
  REQUIRE(a.get(31, 31, 31) == 'a');
}

TEST_CASE("Test Serde", "[all]") {
  auto serde = [](const Tensor<uint32_t>& tensor) {
    auto blob = transport::to_base64(transport::to_compressed_blob(tensor));
    Tensor<uint32_t> loaded;
    transport::from_compressed_blob(loaded, transport::from_base64(blob));
    return loaded;
  };

  auto check_tensor_equality = [](const Tensor<uint32_t>& t1,
                                  const Tensor<uint32_t>& t2) {
    REQUIRE(t1.shape == t2.shape);
    for (uint32_t x = 0; x < t1.shape.x; ++x) {
      for (uint32_t y = 0; y < t1.shape.y; ++y) {
        for (uint32_t z = 0; z < t1.shape.z; ++z) {
          REQUIRE(t1.get({x, y, z}) == t2.get({x, y, z}));
        }
      }
    }
  };

  auto random_tensor = [](Vec3u shape) {
    static std::mt19937 gen{42};
    static std::uniform_int_distribution<uint32_t> distribution{0, 10};

    SparseTensorBuilder<uint32_t> builder{shape};
    for (uint32_t x = 0; x < shape.x; ++x) {
      for (uint32_t y = 0; y < shape.y; ++y) {
        for (uint32_t z = 0; z < shape.z; ++z) {
          builder.set({x, y, z}, distribution(gen));
        }
      }
    }

    return std::move(builder).build();
  };

  auto check_tensor = [&](const Tensor<uint32_t>& t) {
    check_tensor_equality(t, serde(t));
  };

  SECTION("Empty Tensor") {
    check_tensor(tensors::make_tensor<uint32_t>({0, 0, 0}));
    check_tensor(tensors::make_tensor<uint32_t>({32, 0, 0}));
    check_tensor(tensors::make_tensor<uint32_t>({0, 128, 128}));
  }

  SECTION("Single Chunk Tensor") {
    check_tensor(tensors::make_tensor<uint32_t>({1, 1, 1}, 1));
    check_tensor(tensors::make_tensor<uint32_t>({1, 2, 1}, 2));
    check_tensor(random_tensor({3, 3, 3}));
    check_tensor(random_tensor({8, 8, 8}));
    check_tensor(random_tensor({16, 1, 1}));
    check_tensor(random_tensor({31, 32, 32}));
    check_tensor(random_tensor({32, 32, 32}));
  }

  SECTION("Larger Tensors") {
    check_tensor(random_tensor({33, 33, 33}));
    check_tensor(random_tensor({48, 48, 48}));
    check_tensor(random_tensor({48, 1, 1}));
    check_tensor(random_tensor({64, 64, 1}));
    check_tensor(random_tensor({64, 64, 64}));
    check_tensor(random_tensor({75, 32, 3}));
  }
}

TEST_CASE("Test Serde Efficiency", "[all]") {
  auto a = make_tensor<uint8_t>({32u, 32u, 32u}, 0);
  REQUIRE(transport::to_blob(a).size() < 100);

  auto b = make_tensor<uint8_t>({32u, 32u, 32u}, 255);
  REQUIRE(transport::to_blob(b).size() < 100);
}
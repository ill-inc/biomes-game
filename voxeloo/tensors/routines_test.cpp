#include "voxeloo/tensors/routines.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/sparse.hpp"

using namespace voxeloo;           // NOLINT
using namespace voxeloo::tensors;  // NOLINT

TEST_CASE("Test array value mapping", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder(8);
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'b');
    builder.add(1, 'c');
    return std::move(builder).build();
  }();

  auto mapped = map_values(array, [](auto val) {
    return val == 'a' ? 'b' : val;
  });

  REQUIRE(mapped.get(0) == 'b');
  REQUIRE(mapped.get(1) == 'b');
  REQUIRE(mapped.get(2) == 'b');
  REQUIRE(mapped.get(3) == 'b');
  REQUIRE(mapped.get(4) == 'b');
  REQUIRE(mapped.get(5) == 'b');
  REQUIRE(mapped.get(6) == 'b');
  REQUIRE(mapped.get(7) == 'b');
  REQUIRE(mapped.get(8) == 'b');
  REQUIRE(mapped.get(9) == 'c');

  REQUIRE(mapped.size() == 10);
  REQUIRE(mapped.dict.count() == 2);
}

TEST_CASE("Test array dense mapping", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder(8);
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'a');
    builder.add(2, 'b');
    builder.add(1, 'b');
    builder.add(1, 'c');
    return std::move(builder).build();
  }();

  auto mapped = map_dense(array, [](auto pos, auto val) {
    return pos / 2;
  });

  REQUIRE(mapped.get(0) == 0);
  REQUIRE(mapped.get(1) == 0);
  REQUIRE(mapped.get(2) == 1);
  REQUIRE(mapped.get(3) == 1);
  REQUIRE(mapped.get(4) == 2);
  REQUIRE(mapped.get(5) == 2);
  REQUIRE(mapped.get(6) == 3);
  REQUIRE(mapped.get(7) == 3);
  REQUIRE(mapped.get(8) == 4);
  REQUIRE(mapped.get(9) == 4);

  REQUIRE(mapped.size() == 10);
  REQUIRE(mapped.dict.count() == 5);
}

TEST_CASE("Test array sparse mapping", "[all]") {
  auto array = [] {
    ArrayBuilder<int> builder(8);
    builder.add(1, 0);
    builder.add(1, 0);
    builder.add(1, 1);
    builder.add(2, 0);
    builder.add(1, 1);
    builder.add(2, 0);
    builder.add(2, 1);
    return std::move(builder).build();
  }();

  auto mapped = map_sparse(array, [](auto pos, auto val) {
    return pos;
  });

  REQUIRE(mapped.get(0) == 0);
  REQUIRE(mapped.get(1) == 0);
  REQUIRE(mapped.get(2) == 2);
  REQUIRE(mapped.get(3) == 0);
  REQUIRE(mapped.get(4) == 0);
  REQUIRE(mapped.get(5) == 5);
  REQUIRE(mapped.get(6) == 0);
  REQUIRE(mapped.get(7) == 0);
  REQUIRE(mapped.get(8) == 8);
  REQUIRE(mapped.get(9) == 9);

  REQUIRE(mapped.size() == 10);
  REQUIRE(mapped.dict.count() == 7);
}

TEST_CASE("Test array merge routine", "[all]") {
  auto array_1 = [] {
    ArrayBuilder<int> builder;
    builder.add(1, 1);
    builder.add(1, 1);
    builder.add(1, 1);
    builder.add(2, 2);
    builder.add(1, 1);
    builder.add(2, 2);
    builder.add(1, 2);
    builder.add(1, 3);
    return std::move(builder).build();
  }();

  auto array_2 = [] {
    ArrayBuilder<int> builder;
    builder.add(1, 0);
    builder.add(1, 0);
    builder.add(1, 0);
    builder.add(2, 4);
    builder.add(1, 0);
    builder.add(2, 4);
    builder.add(1, 4);
    builder.add(1, 0);
    return std::move(builder).build();
  }();

  auto out = merge(array_1, array_2, [](auto v1, auto v2) {
    return v2 ? v2 : v1;
  });

  REQUIRE(out.get(0) == 1);
  REQUIRE(out.get(1) == 1);
  REQUIRE(out.get(2) == 1);
  REQUIRE(out.get(3) == 4);
  REQUIRE(out.get(4) == 4);
  REQUIRE(out.get(5) == 1);
  REQUIRE(out.get(6) == 4);
  REQUIRE(out.get(7) == 4);
  REQUIRE(out.get(8) == 4);
  REQUIRE(out.get(9) == 3);

  REQUIRE(out.size() == 10);
  REQUIRE(out.dict.count() == 5);
}

TEST_CASE("Test optional arrays", "[all]") {
  auto array_1 = [] {
    ArrayBuilder<int> builder(8);
    builder.add(4, 0);
    builder.add(1, 1);
    builder.add(1, 2);
    builder.add(4, 0);
    return std::move(builder).build();
  }();

  auto array_2 = map_sparse(array_1, [](auto pos, auto val) {
    return std::optional(2 * val);
  });

  std::vector<int> values;
  scan_sparse(array_2, [&](auto pos, auto val) {
    values.push_back(val.value());
  });

  REQUIRE(values.size() == 2);
  REQUIRE(values[0] == 2);
  REQUIRE(values[1] == 4);
}

TEST_CASE("Test all and any routines", "[all]") {
  auto array = [] {
    ArrayBuilder<char> builder(4);
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    builder.add(1, 'a');
    return std::move(builder).build();
  }();

  REQUIRE(array.dict.count() == 1);
  REQUIRE(tensors::all(array, [](auto val) {
    return val == 'a';
  }));
  REQUIRE(tensors::any(array, [](auto val) {
    return val == 'a';
  }));
  REQUIRE(!tensors::any(array, [](auto val) {
    return val == 'b';
  }));
}

TEST_CASE("Test to_dense routine", "[all]") {
  auto tensor = [] {
    tensors::SparseTensorBuilder<char> builder({32, 32, 32});
    builder.set({0, 0, 0}, 'a');
    builder.set({1, 2, 3}, 'b');
    builder.set({9, 8, 7}, 'c');
    return std::move(builder).build();
  }();

  auto dense = tensors::to_dense_xyz(tensor);
  REQUIRE(dense.size() == 32 * 32 * 32);
  REQUIRE(dense[0 + (0 + 0 * 32) * 32] == 'a');
  REQUIRE(dense[1 + (2 + 3 * 32) * 32] == 'b');
  REQUIRE(dense[9 + (8 + 7 * 32) * 32] == 'c');

  dense[0 + (0 + 0 * 32) * 32] = '\0';
  dense[1 + (2 + 3 * 32) * 32] = '\0';
  dense[9 + (8 + 7 * 32) * 32] = '\0';

  auto i = 0u;
  for (auto z = 0u; z < tensors::kChunkDim; z += 1) {
    for (auto y = 0u; y < tensors::kChunkDim; y += 1) {
      for (auto x = 0u; x < tensors::kChunkDim; x += 1) {
        REQUIRE(dense[i++] == '\0');
      }
    }
  }
}
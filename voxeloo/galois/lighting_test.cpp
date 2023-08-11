#include "voxeloo/galois/lighting.hpp"

#include <catch2/catch.hpp>

#include "voxeloo/galois/gen/light_kernel.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

using namespace voxeloo;          // NOLINT
using namespace voxeloo::galois;  // NOLINT

auto v(auto val) {
  return Vec3{val, val, val};
}

TEST_CASE("Test light kernel case 1", "[all]") {
  auto mask = lighting::apply_light_kernel_with_occlusion<lighting::LightMask>(
      0b00000010,
      {v(0.0f), v(0.0f), v(0.0f), v(0.0f), v(0.0f), v(0.0f), v(1.0f), v(0.0f)});

  REQUIRE(mask.get({0, 0, 0}) == v(0u));
  REQUIRE(mask.get({1, 0, 0}) == v(0u));
  REQUIRE(mask.get({0, 1, 0}) == v(0u));
  REQUIRE(mask.get({1, 1, 0}) == v(0u));
  REQUIRE(mask.get({0, 0, 1}) == v(0u));
  REQUIRE(mask.get({1, 0, 1}) == v(0u));
  REQUIRE(mask.get({0, 1, 1}) == v(2u));
  REQUIRE(mask.get({1, 1, 1}) == v(0u));
}

TEST_CASE("Test light kernel case 2", "[all]") {
  auto mask = lighting::apply_light_kernel_with_occlusion<lighting::LightMask>(
      0b01101001,
      {v(0.0f), v(1.0f), v(1.0f), v(0.0f), v(1.0f), v(0.0f), v(0.0f), v(1.0f)});

  REQUIRE(mask.get({0, 0, 0}) == v(0u));
  REQUIRE(mask.get({1, 0, 0}) == v(2u));
  REQUIRE(mask.get({0, 1, 0}) == v(2u));
  REQUIRE(mask.get({1, 1, 0}) == v(0u));
  REQUIRE(mask.get({0, 0, 1}) == v(2u));
  REQUIRE(mask.get({1, 0, 1}) == v(0u));
  REQUIRE(mask.get({0, 1, 1}) == v(0u));
  REQUIRE(mask.get({1, 1, 1}) == v(2u));
}

TEST_CASE("Test light kernel case 3", "[all]") {
  auto mask = lighting::apply_light_kernel_with_occlusion<lighting::LightMask>(
      0b01100110,
      {v(0.0f), v(1.0f), v(1.0f), v(0.0f), v(0.0f), v(1.0f), v(1.0f), v(0.0f)});

  REQUIRE(mask.get({0, 0, 0}) == v(0u));
  REQUIRE(mask.get({1, 0, 0}) == v(4u));
  REQUIRE(mask.get({0, 1, 0}) == v(4u));
  REQUIRE(mask.get({1, 1, 0}) == v(0u));
  REQUIRE(mask.get({0, 0, 1}) == v(0u));
  REQUIRE(mask.get({1, 0, 1}) == v(4u));
  REQUIRE(mask.get({0, 1, 1}) == v(4u));
  REQUIRE(mask.get({1, 1, 1}) == v(0u));
}

TEST_CASE("Test light kernel case 4", "[all]") {
  auto mask = lighting::apply_light_kernel_with_occlusion<lighting::LightMask>(
      0b00110011,
      {v(0.0f), v(0.0f), v(1.0f), v(1.0f), v(0.0f), v(1.0f), v(1.0f), v(1.0f)});

  REQUIRE(mask.get({0, 0, 0}) == v(0u));
  REQUIRE(mask.get({1, 0, 0}) == v(0u));
  REQUIRE(mask.get({0, 1, 0}) == v(8u));
  REQUIRE(mask.get({1, 1, 0}) == v(8u));
  REQUIRE(mask.get({0, 0, 1}) == v(0u));
  REQUIRE(mask.get({1, 0, 1}) == v(0u));
  REQUIRE(mask.get({0, 1, 1}) == v(8u));
  REQUIRE(mask.get({1, 1, 1}) == v(8u));
}

TEST_CASE("Test to light tensor", "[all]") {
  auto tensor = [] {
    tensors::SparseTensorBuilder<uint32_t> builder({32u, 32u, 32u});
    builder.set({0, 1, 0}, 1);
    builder.set({1, 1, 0}, 1);
    builder.set({0, 1, 1}, 1);
    builder.set({1, 1, 1}, 1);
    return std::move(builder).build();
  }();

  auto surface = [] {
    tensors::SparseTensorBuilder<bool> builder({32u, 32u, 32u});
    builder.set({0, 0, 0}, true);
    builder.set({1, 0, 0}, true);
    builder.set({0, 0, 1}, true);
    builder.set({1, 0, 1}, true);

    builder.set({0, 1, 2}, true);
    builder.set({1, 1, 2}, true);
    builder.set({2, 1, 0}, true);
    builder.set({2, 1, 1}, true);

    builder.set({0, 2, 0}, true);
    builder.set({1, 2, 0}, true);
    builder.set({0, 2, 1}, true);
    builder.set({1, 2, 1}, true);
    return std::move(builder).build();
  }();

  // Returns whether a given voxel in the tensor is occlusive or not.
  auto occ_fn = [&](Vec3i pos) {
    if (voxels::shape_contains(tensor.shape, pos)) {
      return tensor.get(to<uint32_t>(pos)) != 0;
    }
    return false;
  };

  // Cached routine producing irradiance lighting at a given voxel vertex.
  auto irr_fn = lighting::make_vertex_fn(occ_fn, [&](Vec3i pos) {
    return Vec3f{};
    ;
  });

  // Cached routine producing sky-occlusion lighting at a given voxel vertex.
  auto sky_fn = lighting::make_vertex_fn(occ_fn, [&](Vec3i pos) {
    return occ_fn(pos) ? Vec3f{} : Vec3f{1.0f, 1.0f, 1.0f};
  });

  auto light = lighting::to_light_tensor(surface, irr_fn, sky_fn);

  // Check voxel 0,0,0
  {
    lighting::LightMask mask;
    mask.set({0, 0, 0}, v(15u));
    mask.set({1, 0, 0}, v(15u));
    mask.set({0, 0, 1}, v(15u));
    mask.set({1, 0, 1}, v(15u));
    mask.set({0, 1, 0}, v(13u));
    mask.set({1, 1, 0}, v(11u));
    mask.set({0, 1, 1}, v(11u));
    mask.set({1, 1, 1}, v(8u));
    REQUIRE(std::get<1>(light.get({0, 0, 0}).value()) == mask.value.x);
  }
}
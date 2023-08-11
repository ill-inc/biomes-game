#include "voxeloo/gaia/muck.hpp"

#include <catch2/catch.hpp>
#include <iostream>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/gaia/maps.hpp"
#include "voxeloo/tensors/tensors.hpp"

using namespace voxeloo;  // NOLINT

TEST_CASE("Test gradient computation for AABBs", "[all]") {
  auto muck = gaia::WorldMap<uint8_t>{
      {{32, 32, 32}, {64, 64, 64}},
      tensors::make_tensor<uint8_t>({32u, 32u, 32u}, 0),
  };

  auto src = vec3(16.0, 16.0, 16.0);
  auto box = vec3(32.0, 32.0, 32.0);

  auto grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);

  // Clear over the shard: [[0,0,0], [32,32,32]].
  gaia::update_muck_gradient_with_aabb(grad, muck, src, box, 1);
  tensors::scan_dense(grad, [](auto pos, auto val) {
    REQUIRE(val == 1);
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_aabb(grad, muck, src, box, 1);
  tensors::scan_dense(grad, [](auto pos, auto val) {
    auto [x, y, z] = pos;
    if (std::max({x, y, z}) < 8) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_aabb(grad, muck, src, box, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto [x, y, z] = pos;
    if (std::max({x, y, z}) < 16) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_aabb(grad, muck, src, box, 1);
  tensors::scan_dense(grad, [](auto pos, auto val) {
    auto [x, y, z] = pos;
    if (std::max({x, y, z}) < 24) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_aabb(grad, muck, src, box, 1);
  tensors::scan_dense(grad, [](auto pos, auto val) {
    REQUIRE(val == 0);
  });

  // Make it all zero.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_aabb(
      grad, muck, {48.0, 48.0, 48.0}, {32.0, 32.0, 32.0}, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    if (muck.get(to<int>(pos) + vec3(32, 32, 32)) == 0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == -1);
    }
  });
}

TEST_CASE("Test gradient computation for spheres", "[all]") {
  auto muck = gaia::WorldMap<uint8_t>{
      {{32, 32, 32}, {64, 64, 64}},
      tensors::make_tensor<uint8_t>({32u, 32u, 32u}, 0),
  };

  auto src = vec3(16.0, 16.0, 16.0);
  auto rad = 27.7128129;

  auto grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);

  gaia::update_muck_gradient_with_sphere(grad, muck, src, rad, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto mid = to<double>(pos) + vec3(0.5, 0.5, 0.5);
    if (norm(mid + src) < rad) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_sphere(grad, muck, src, rad, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto mid = to<double>(pos) + vec3(0.5, 0.5, 0.5);
    if (norm(mid + src) < rad + 8.0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_sphere(grad, muck, src, rad, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto mid = to<double>(pos) + vec3(0.5, 0.5, 0.5);
    if (norm(mid + src) < rad + 16.0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_sphere(grad, muck, src, rad, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto mid = to<double>(pos) + vec3(0.5, 0.5, 0.5);
    if (norm(mid + src) < rad + 24.0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });
  gaia::apply_muck_gradient(muck, grad);

  // Repeat gradient, more areas will be 0 now.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_sphere(grad, muck, src, rad, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    auto mid = to<double>(pos) + vec3(0.5, 0.5, 0.5);
    if (norm(mid + src) < rad + 32.0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == 1);
    }
  });

  // Make it all zero.
  grad = tensors::make_tensor<int>({32u, 32u, 32u}, 1);
  gaia::update_muck_gradient_with_sphere(
      grad, muck, {48.0, 48.0, 48.0}, 32.0, 1);
  tensors::scan_dense(grad, [&](auto pos, auto val) {
    if (muck.get(to<int>(pos) + vec3(32, 32, 32)) == 0) {
      REQUIRE(val == 0);
    } else {
      REQUIRE(val == -1);
    }
  });
}
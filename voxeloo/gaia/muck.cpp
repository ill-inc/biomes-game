#include "voxeloo/gaia/muck.hpp"

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

constexpr static auto kMuckMaximum = 15;
constexpr static auto kMuckQuantum = 8;

namespace {
auto square(double x) {
  return x * x;
}

template <typename GradFn>
tensors::Tensor<int> to_muck_gradient(
    WorldMap<uint8_t>& muck, GradFn&& grad_fn) {
  return tensors::map_dense(muck.tensor, [&](auto pos, auto val) {
    auto grad = grad_fn(to<double>(muck.aabb.v0 + to<int>(pos)), val);
    return static_cast<uint8_t>(std::clamp(val + grad, 0, kMuckMaximum));
  });
}

template <typename Fn>
auto map_muck(const WorldMap<uint8_t>& muck, Fn&& fn) {
  return tensors::map_dense(muck.tensor, [&](auto pos, auto val) {
    return fn(to<double>(muck.aabb.v0 + to<int>(pos)), val);
  });
}

template <typename Fn>
auto solve(uint8_t src, uint32_t steps, Fn&& fn) {
  auto dst = src;
  for (auto i = 0u; i < steps; i += 1) {
    auto grad = fn(dst);
    if (grad == 0) {
      break;
    } else if (grad < 0 && dst == 0) {
      break;
    } else if (grad > 0 && dst == kMuckMaximum) {
      break;
    } else {
      dst += grad;
    }
  }
  return dst - src;
}

}  // namespace

void update_muck_gradient_with_sphere(
    tensors::Tensor<int>& grad,
    const WorldMap<uint8_t>& muck,
    Vec3d unmuck_source,
    double unmuck_radius,
    uint32_t step_size) {
  auto update = map_muck(muck, [&](auto pos, auto val) {
    auto mid = pos + vec3(0.5, 0.5, 0.5);
    auto tgt = square_norm(mid - unmuck_source);
    return solve(val, step_size, [&](auto src) {
      if (square(kMuckQuantum * src + unmuck_radius) <= tgt) {
        return 1;
      } else if (square(kMuckQuantum * (src - 1) + unmuck_radius) > tgt) {
        return -1;
      } else {
        return 0;
      }
    });
  });
  grad = tensors::merge(grad, update, [](auto l, auto r) {
    return std::min(l, r);
  });
}

void update_muck_gradient_with_aabb(
    tensors::Tensor<int>& grad,
    const WorldMap<uint8_t>& muck,
    Vec3d unmuck_source,
    Vec3d unmuck_size,
    uint32_t step_size) {
  auto update = map_muck(muck, [&](auto pos, auto val) {
    auto mid = pos + vec3(0.5, 0.5, 0.5);
    auto [dx, dy, dz] = abs(unmuck_source - mid) - 0.5 * unmuck_size;
    auto tgt = ifloor(std::max({dx, dy, dz}) / kMuckQuantum) + 1;
    return solve(val, step_size, [&](auto src) {
      if (src < tgt) {
        return 1;
      } else if (src > tgt) {
        return -1;
      } else {
        return 0;
      }
    });
  });
  grad = tensors::merge(grad, update, [](auto l, auto r) {
    return std::min(l, r);
  });
}

void apply_muck_gradient(
    WorldMap<uint8_t>& muck, const tensors::Tensor<int>& grad) {
  muck.tensor = tensors::merge(muck.tensor, grad, [](auto m, auto g) {
    auto update = static_cast<int>(m) + g;
    return static_cast<uint8_t>(std::clamp(update, 0, kMuckMaximum));
  });
}

}  // namespace voxeloo::gaia

#include "voxeloo/biomes/culling.hpp"

#include <Eigen/Dense>
#include <algorithm>
#include <cstdint>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/hull.hpp"
#include "voxeloo/common/march.hpp"
#include "voxeloo/common/subbox.hpp"
#include "voxeloo/common/utils.hpp"
#include "voxeloo/tensors/routines.hpp"

namespace voxeloo::culling {

namespace {

inline auto aabb_matrix(const AABB& aabb) {
  auto [x0, y0, z0] = aabb.v0;
  auto [x1, y1, z1] = aabb.v1;

  Eigen::Matrix<double, 4, 8> ret;
  ret.block<4, 1>(0, 0) << x0, y0, z0, 1;
  ret.block<4, 1>(0, 1) << x1, y0, z0, 1;
  ret.block<4, 1>(0, 2) << x0, y1, z0, 1;
  ret.block<4, 1>(0, 3) << x1, y1, z0, 1;
  ret.block<4, 1>(0, 4) << x0, y0, z1, 1;
  ret.block<4, 1>(0, 5) << x1, y0, z1, 1;
  ret.block<4, 1>(0, 6) << x0, y1, z1, 1;
  ret.block<4, 1>(0, 7) << x1, y1, z1, 1;
  return ret;
}

using Points = std::vector<Vec2d>;

inline auto project_aabb(const Mat4x4d& proj, const AABB& aabb) {
  auto clip = (Eigen::Matrix4d{&proj[0]} * aabb_matrix(aabb)).eval();

  Points points;
  points.reserve(8);
  for (auto i = 0; i < 8; i += 1) {
    if (clip(2, i) >= -clip(3, i)) {
      points.push_back({
          0.5 * clip(0, i) / clip(3, i) + 0.5,
          0.5 * clip(1, i) / clip(3, i) + 0.5,
      });
    }
  }
  return points;
}

auto to_projected_hull(const Points& points) {
  auto border = hull::graham(points);

  Points ret(border.size());
  for (auto i = 0u; i < border.size(); i += 1) {
    ret[i] = points[border[i]];
  }
  return ret;
}

template <typename Fn>
void rasterize_hull(const Vec2u& shape, const Points& hull, Fn&& fn) {
  for (auto i = 0u; i < hull.size(); i += 1) {
    auto a = to<double>(shape) * hull[i];
    auto b = to<double>(shape) * hull[(i + 1u) % hull.size()];
    march::march_2d(a, b, fn);
  }
}

}  // namespace

void OcclusionCuller::write(const AABB& aabb) {
  rasterize_aabb_exclusive(buffer_, proj_, aabb);
}

bool OcclusionCuller::test(const AABB& aabb) const {
  auto shape = to<int>(buffer_.shape());

  // Project the AABB to screen space.
  auto points = project_aabb(proj_, aabb);
  if (points.size() < 8) {
    return true;  // Assume not occluded if beyond near plane.
  }

  // Compute the convex hull of the projected AABB.
  auto hull = to_projected_hull(points);

  // Find the minimum and maximum rasterization y-coordinate.
  auto y_min = shape.y, y_max = 0;
  for (const auto& point : hull) {
    auto h = static_cast<double>(shape.y);
    auto y = static_cast<int>(std::clamp(h * point.y, 0.0, h - 1.0));
    y_min = std::min(y_min, y);
    y_max = std::max(y_max, y + 1);
  }
  if (y_min >= y_max) {
    return false;  // Frustum culled.
  }

  // Allocate a buffer to store the x ranges.
  std::vector<Vec2i> x_ranges(y_max - y_min, {shape.x, 0});

  // Rasterize the hull to compute the scanlines. Pass the occlusion test if
  // any pixel is discovered along an edge that is not set in the buffer.
  bool done = false;
  rasterize_hull(to<unsigned int>(shape), hull, [&](auto pos) {
    if (pos.y >= 0 && pos.y < shape.y) {
      auto& range = x_ranges[pos.y - y_min];
      range.x = std::clamp<int>(pos.x + 1, 0, range.x);
      range.y = std::clamp<int>(pos.x, range.y, shape.x);
      if (pos.x >= 0 && pos.x < shape.x) {
        if (!buffer_.get(to<unsigned int>(pos))) {
          done = true;
          return false;
        }
      }
    }
    return true;
  });
  if (done) {
    return true;
  }

  // Rasterize the interior scan lines.
  for (auto y = y_min; y < y_max; y += 1) {
    auto [lo, hi] = x_ranges[y - y_min];
    for (auto x = lo; x < hi; x += 1) {
      if (!buffer_.get(to<unsigned int>(vec2(x, y)))) {
        return true;
      }
    }
  }

  return false;  // Every pixel was fully occluded, fail test.
}

void rasterize_aabb_inclusive(
    OcclusionBuffer& buffer, const Mat4x4d& proj, const AABB& aabb) {
  auto shape = to<int>(buffer.shape());

  // Project the AABB to screen space.
  auto points = project_aabb(proj, aabb);
  if (points.empty()) {
    return;
  }

  // Compute the convex hull of the projected AABB.
  auto hull = to_projected_hull(points);

  // Find the minimum and maximum rasterization y-coordinate.
  auto y_min = shape.y, y_max = 0;
  for (const auto& point : hull) {
    auto h = static_cast<double>(shape.y);
    auto y = static_cast<int>(std::clamp(h * point.y, 0.0, h - 1.0));
    y_min = std::min(y_min, y);
    y_max = std::max(y_max, y + 1);
  }
  if (y_min >= y_max) {
    return;
  }

  // Allocate a buffer to store the x ranges.
  std::vector<Vec2i> x_ranges(y_max - y_min, {shape.x, 0});

  // Rasterize the hull to compute the scanlines _and_ write to the buffer.
  rasterize_hull(to<unsigned int>(shape), hull, [&](auto pos) {
    if (pos.y >= 0 && pos.y < shape.y) {
      auto& range = x_ranges[pos.y - y_min];
      range.x = std::clamp<int>(pos.x + 1, 0, range.x);
      range.y = std::clamp<int>(pos.x, range.y, shape.x);
      if (pos.x >= 0 && pos.x < shape.x) {
        buffer.set(to<unsigned int>(pos));
      }
    }
    return true;
  });

  // Rasterize the interior scan lines.
  for (auto y = y_min; y < y_max; y += 1) {
    auto [lo, hi] = x_ranges[y - y_min];
    for (auto x = lo; x < hi; x += 1) {
      buffer.set(to<unsigned int>(vec2(x, y)));
    }
  }
}

void rasterize_aabb_exclusive(
    OcclusionBuffer& buffer, const Mat4x4d& proj, const AABB& aabb) {
  auto shape = to<int>(buffer.shape());

  // Project the AABB to screen space.
  auto points = project_aabb(proj, aabb);
  if (points.size() < 3) {
    return;
  }

  // Compute the convex hull of the projected AABB.
  auto hull = to_projected_hull(points);

  // Find the minimum and maximum rasterization y-coordinate.
  auto y_min = shape.y, y_max = 0;
  for (const auto& point : hull) {
    auto h = static_cast<double>(shape.y);
    auto y = static_cast<int>(std::clamp(shape.y * point.y, 0.0, h - 1.0));
    y_min = std::min(y_min, y);
    y_max = std::max(y_max, y + 1);
  }
  if (y_min >= y_max) {
    return;
  }

  // Allocate a buffer to store the x ranges.
  std::vector<Vec2i> x_ranges(y_max - y_min, {shape.x, 0});

  // Rasterize the hull to compute the scanline ranges and record the prior.
  std::vector<bool> prior;
  prior.reserve((y_max - y_min) << 3);
  rasterize_hull(to<unsigned int>(shape), hull, [&](auto pos) {
    if (pos.y >= 0 && pos.y < shape.y) {
      auto& range = x_ranges[pos.y - y_min];
      range.x = std::clamp<int>(pos.x + 1, 0, range.x);
      range.y = std::clamp<int>(pos.x, range.y, shape.x);
      if (pos.x >= 0 && pos.x < shape.x) {
        prior.push_back(buffer.get(to<unsigned int>(pos)));
      }
    }
    return true;
  });

  // Rasterize the interior scan lines.
  for (auto y = y_min; y < y_max; y += 1) {
    auto [lo, hi] = x_ranges[y - y_min];
    for (auto x = lo; x < hi; x += 1) {
      buffer.set(to<unsigned int>(vec2(x, y)));
    }
  }

  // Do a second rasterization pass to clear the boundary.
  auto it = 0;
  rasterize_hull(to<unsigned int>(shape), hull, [&](auto pos) {
    if (pos.x >= 0 && pos.y >= 0 && pos.x < shape.x && pos.y < shape.y) {
      if (!prior[it++]) {
        buffer.del(to<unsigned int>(pos));
      }
    }
    return true;
  });
}

void rasterize_many_aabb_inclusive(
    OcclusionBuffer& buffer,
    const Mat4x4d& proj,
    const std::vector<AABB>& aabbs) {
  for (const auto& aabb : aabbs) {
    rasterize_aabb_inclusive(buffer, proj, aabb);
  }
}

void rasterize_many_aabb_exclusive(
    OcclusionBuffer& buffer,
    const Mat4x4d& proj,
    const std::vector<AABB>& aabbs) {
  for (const auto& aabb : aabbs) {
    rasterize_aabb_exclusive(buffer, proj, aabb);
  }
}

static constexpr auto kOccluderMinFraction = 16u;

Occluder to_occluder(const tensors::Tensor<bool>& tensor, Vec3d origin) {
  Occluder ret;

  // Immediately return if the tensor is full or empty.
  if (tensors::all(tensor)) {
    ret.push_back({origin, origin + to<double>(tensor.shape)});
  } else {
    auto threshold = tensors::shape_len(tensor.shape) / kOccluderMinFraction;
    auto volume = tensors::count(tensor);
    auto matrix = tensors::to_dense_xzy(tensor);
    while (volume > threshold) {
      auto box = subbox::solve_approx(matrix, tensor.shape);
      if (subbox::volume(box) > threshold) {
        volume -= subbox::volume(box);
        ret.push_back({
            origin + to<double>(box.v0.xzy()),
            origin + to<double>(box.v1.xzy()),
        });
        for (auto z = box.v0.z; z < box.v1.z; z += 1) {
          for (auto y = box.v0.y; y < box.v1.y; y += 1) {
            for (auto x = box.v0.x; x < box.v1.x; x += 1) {
              matrix[x + (y + z * tensor.shape.y) * tensor.shape.x] = false;
            }
          }
        }
      } else {
        break;
      }
    }
  }

  return ret;
}

}  // namespace voxeloo::culling

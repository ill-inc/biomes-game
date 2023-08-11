#include "voxeloo/common/hull.hpp"

#include <algorithm>
#include <numeric>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo::hull {

std::vector<size_t> jarvis(const std::vector<Vec2d>& points) {
  CHECK_ARGUMENT(points.size() > 0);

  // Find the left-most point.
  auto i = 0;
  for (auto j = 1u; j < points.size(); j += 1) {
    if (points[i].x > points[j].x) {
      i = j;
    }
  }

  // Emit all points on the convex hull.
  std::vector<size_t> out;
  out.reserve(points.size());
  do {
    out.push_back(i);
    auto k = out[0];
    for (auto j = 0u; j < points.size(); j += 1) {
      if (i == k) {
        k = j;
      } else {
        auto u = points[j] - points[i];
        auto v = points[k] - points[i];
        if (u.y * v.x - u.x * v.y < 0) {
          k = j;
        }
      }
    }
    i = k;
  } while (out[0] != i);

  return out;
}

std::vector<size_t> graham(const std::vector<Vec2d>& points) {
  CHECK_ARGUMENT(points.size() > 0);

  // Find the bottom-most point.
  auto i = 0;
  for (auto j = 1u; j < points.size(); j += 1) {
    if (points[i].y > points[j].y) {
      i = j;
    }
  }

  // Build an index of the points, sorted by their polar angle
  std::vector<size_t> indices(points.size());
  std::iota(indices.begin(), indices.end(), 0);
  std::swap(indices[0], indices[i]);
  std::sort(indices.begin() + 1, indices.end(), [&](auto& j, auto& k) {
    auto u = points[j] - points[i];
    auto v = points[k] - points[i];
    return u.y * v.x - u.x * v.y < 0;
  });

  std::vector<size_t> out;
  out.reserve(points.size());

  // Emit all points on the convex hull.
  for (auto j : indices) {
    while (out.size() > 1) {
      auto h = out.size();
      auto u = points[j] - points[out[h - 2]];
      auto v = points[out[h - 1]] - points[out[h - 2]];
      if (u.y * v.x - u.x * v.y < 0) {
        out.pop_back();
      } else {
        break;
      }
    }
    out.push_back(j);
  }

  return out;
}

}  // namespace voxeloo::hull

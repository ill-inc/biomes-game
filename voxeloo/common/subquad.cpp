#include "voxeloo/common/subquad.hpp"

#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"

namespace voxeloo::subquad {

namespace {

inline auto area(const Quad& quad) {
  auto size = quad.v1 - min(quad.v0, quad.v1);
  return size.x * size.y;
}

inline auto transpose(const Quad& quad) {
  return Quad{quad.v0.yx(), quad.v1.yx()};
}

inline auto largest_quad_in_histogram(const std::vector<uint32_t>& heights) {
  const auto n = static_cast<uint32_t>(heights.size());

  Quad ret{{0, 0}, {0, 0}};
  std::vector<uint32_t> stack;
  stack.reserve(n);
  for (auto i = 0u; i < n;) {
    auto h = heights[i];
    if (stack.empty() || h >= heights[stack.back()]) {
      stack.push_back(i);
      i += 1;
    } else {
      while (!stack.empty() && h < heights[stack.back()]) {
        auto j = stack.back();
        stack.pop_back();
        auto k = stack.empty() ? 0u : stack.back() + 1u;
        if (area(ret) < heights[j] * (i - k)) {
          ret = Quad{{j, 0}, {i, heights[j]}};
        }
      }
    }
  }
  while (!stack.empty()) {
    auto j = stack.back();
    stack.pop_back();
    auto k = stack.empty() ? 0u : stack.back() + 1u;
    if (area(ret) < heights[j] * (n - k)) {
      ret = Quad{{k, 0u}, {n, heights[j]}};
    }
  }
  return ret;
}

inline auto to_row_mask(const std::vector<bool>& mask, Vec2u shape) {
  std::vector<uint32_t> rows(shape.y);
  auto it = mask.begin();
  for (auto i = 0u; i < shape.y; i += 1) {
    for (auto j = 0u; j < shape.x; j += 1) {
      rows[i] |= static_cast<uint32_t>(*it++) << j;
    }
  }
  return rows;
}

inline auto to_col_mask(const std::vector<bool>& mask, Vec2u shape) {
  std::vector<uint32_t> cols(shape.x);
  auto it = mask.begin();
  for (auto i = 0u; i < shape.y; i += 1) {
    for (auto j = 0u; j < shape.x; j += 1) {
      cols[j] |= static_cast<uint32_t>(*it++) << i;
    }
  }
  return cols;
}

inline auto solve_32(const std::vector<uint32_t>& mask, Vec2u shape) {
  // Precompute column reductions to skip irrelevant sweep points.
  uint32_t any = 0u;
  uint32_t all = 0xffffffffu;
  for (auto row : mask) {
    any |= ~row;
    all &= ~row;
  }

  Quad ret{{0, 0}, {0, 0}};
  std::vector<uint32_t> widths(shape.y);
  for (auto base = 0u; base < shape.x; base += 1) {
    // Skip this column if all values are 0 or if the previous column is all 1.
    if (all & (1 << base)) {
      continue;
    } else if (base && !(any & (1 << (base - 1)))) {
      continue;
    }

    for (auto y = 0u; y < shape.y; y += 1) {
      widths[y] = next_bit(~mask[y], base) - base;
    }
    auto quad = largest_quad_in_histogram(widths);
    if (area(quad) > area(ret)) {
      ret.v0 = quad.v0.yx() + vec2(base, 0u);
      ret.v1 = quad.v1.yx() + vec2(base, 0u);
    }
  }

  return ret;
}

}  // namespace

Quad solve(const std::vector<bool>& mask, Vec2u shape) {
  CHECK_ARGUMENT(mask.size() == shape.x * shape.y);

  // Handle special case where one size is small enough to pack into an uint32.
  if (shape.x <= 32u) {
    return solve_32(to_row_mask(mask, shape), shape);
  } else if (shape.y <= 32u) {
    return transpose(solve_32(to_col_mask(mask, shape), shape));
  }

  // Fallback to general-purpose solver.
  Quad ret{{0, 0}, {0, 0}};
  std::vector<uint32_t> widths(shape.y);
  for (auto base = 0u; base < shape.x; base += 1) {
    for (auto y = 0u; y < shape.y; y += 1) {
      auto width = shape.x - base;
      for (auto x = base; x < shape.x; x += 1) {
        if (!mask[x + shape.x * y]) {
          width = x - base;
          break;
        }
      }
      widths[y] = width;
    }
    auto quad = largest_quad_in_histogram(widths);
    if (area(quad) > area(ret)) {
      ret.v0 = quad.v0.yx() + vec2(base, 0u);
      ret.v1 = quad.v1.yx() + vec2(base, 0u);
    }
  }

  return ret;
}

}  // namespace voxeloo::subquad

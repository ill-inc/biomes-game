#include "voxeloo/common/subbox.hpp"

#include <iostream>
#include <vector>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/subquad.hpp"

namespace voxeloo::subbox {

Box solve(const std::vector<bool>& mask, Vec3u shape) {
  const auto [w, h, d] = shape;
  const auto layer_size = w * h;

  // For all pairs of layers, solve for the largest quad.
  Box ret{{0, 0, 0}, {0, 0, 0}};
  std::vector<bool> layer(layer_size);
  for (auto i = 0u; i < d; i += 1) {
    layer.assign(layer_size, true);
    for (auto j = i; j < d; j += 1) {
      // Update the layer to reflect the intersection from i to j.
      for (auto k = 0u; k < layer_size; k += 1) {
        layer[k] = layer[k] && mask[layer_size * j + k];
      }

      // Compute the best rectangle inside the intersection mask.
      auto [v0, v1] = subquad::solve(layer, {w, h});
      auto area = (v1.x - v0.x) * (v1.y - v0.y);
      if (!area) {
        break;  // Advance i if all remaining AABBs are empty.
      } else {
        auto best = volume(ret);
        if ((j - i + 1) * area > best) {
          ret = Box{{v0.x, v0.y, i}, {v1.x, v1.y, j + 1}};
        } else if ((d - i) * area <= best) {
          break;  // Advance i if it can never lead to a better AABB.
        }
      }
    }
  }

  return ret;
}

Box solve_approx(const std::vector<bool>& mask, Vec3u shape) {
  const auto [w, h, d] = shape;
  const auto layer_size = w * h;

  std::vector<subquad::Quad> layers;
  layers.reserve(d);

  // Find the best quad along each layer.
  std::vector<bool> layer_mask(layer_size);
  for (auto i = 0u; i < d; i += 1) {
    for (auto j = 0u; j < layer_size; j += 1) {
      layer_mask[j] = mask[i * layer_size + j];
    }
    layers.push_back(subquad::solve(layer_mask, {w, h}));
  }

  // Merge across layers.
  Box ret{{0, 0, 0}, {0, 0, 0}};
  for (auto i = 0u; i < d; i += 1) {
    auto [v0, v1] = layers[i];
    for (auto j = i; j < d; j += 1) {
      v0 = max(v0, layers[j].v0);
      v1 = min(v1, layers[j].v1);
      auto size = v1 - min(v0, v1);
      auto area = size.x * size.y;
      if (!area) {
        break;  // Advance i if all remaining AABBs are empty.
      } else {
        auto best = volume(ret);
        if ((j - i + 1) * area > best) {
          ret = Box{{v0.x, v0.y, i}, {v1.x, v1.y, j + 1}};
        } else if ((d - i) * area <= best) {
          break;  // Advance i if it can never lead to a better AABB.
        }
      }
    }
  }

  return ret;
}

}  // namespace voxeloo::subbox

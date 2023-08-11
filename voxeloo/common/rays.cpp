#include "voxeloo/common/rays.hpp"

#include "voxeloo/common/voxels.hpp"

namespace voxeloo::rays {

float integrate_depth(const DensityMap& dm, Vec3f src, Vec3f dir, float far) {
  float depth = 0.0f;
  float t_prev = 0.0f;
  float d_prev = 0.0f;
  float discount = 1.0f;

  bool sampling = false;
  auto accessor = dm.access();
  voxels::march(src, dir, [&](int x, int y, int z, float t) {
    // If we sampled the previous location, update the depth integral.
    if (sampling) {
      auto dt = t - t_prev;
      auto decay = std::exp(-d_prev * dt);
      depth += discount * (1 - decay) * (t - 0.5f * dt);
      discount *= decay;
    }

    // Figure out whether we should sample the current cell or not.
    sampling = accessor.has(x, y, z);
    if (sampling) {
      t_prev = t;
      d_prev = accessor.get(x, y, z);
    }

    return discount >= 0.001f && t < far;
  });

  return depth + discount * far;
}

}  // namespace voxeloo::rays

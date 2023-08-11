#pragma once

#include <Eigen/Dense>

#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo::frustum {

class IntersectionTest {
 public:
  explicit IntersectionTest(const Mat4x4d& view_proj);

  bool test(const voxels::Box& box) const;

 private:
  Eigen::Matrix4d view_proj_;
};

struct FrustumBounds {
  Vec3d v0;
  Vec3d v1;
};

FrustumBounds get_frustum_bounding_box(const Mat4x4d& view_proj);

}  // namespace voxeloo::frustum

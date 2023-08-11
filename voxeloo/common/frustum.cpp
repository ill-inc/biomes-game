#include "voxeloo/common/frustum.hpp"

namespace voxeloo::frustum {

inline auto aabb_matrix(const Vec3d& v0, const Vec3d& v1) {
  auto [x0, y0, z0] = v0;
  auto [x1, y1, z1] = v1;

  Eigen::Matrix<double, 4, 8> mat;
  mat.block<4, 1>(0, 0) << x0, y0, z0, 1;
  mat.block<4, 1>(0, 1) << x1, y0, z0, 1;
  mat.block<4, 1>(0, 2) << x0, y1, z0, 1;
  mat.block<4, 1>(0, 3) << x1, y1, z0, 1;
  mat.block<4, 1>(0, 4) << x0, y0, z1, 1;
  mat.block<4, 1>(0, 5) << x1, y0, z1, 1;
  mat.block<4, 1>(0, 6) << x0, y1, z1, 1;
  mat.block<4, 1>(0, 7) << x1, y1, z1, 1;
  return mat;
}

inline auto box_corners(const voxels::Box& box) {
  return aabb_matrix(to<double>(box.v0), to<double>(box.v1));
}

IntersectionTest::IntersectionTest(const Mat4x4d& view_proj)
    : view_proj_(&view_proj[0]) {}

bool IntersectionTest::test(const voxels::Box& box) const {
  Eigen::Array<double, 4, 8> clip = view_proj_ * box_corners(box);

  // We conclude that a cell does not intersect the frustum if all of the 8
  // bounding-box vertices lie strictly outside one of the clip planes.
  if ((clip.row(0) < -clip.row(3)).all() || (clip.row(0) > clip.row(3)).all() ||
      (clip.row(1) < -clip.row(3)).all() || (clip.row(1) > clip.row(3)).all() ||
      (clip.row(2) < -clip.row(3)).all() || (clip.row(2) > clip.row(3)).all()) {
    return false;
  }

  return true;
}

inline auto ndc_corners() {
  return aabb_matrix({-1.0, -1.0, -1.0}, {1.0, 1.0, 1.0});
}

FrustumBounds get_frustum_bounding_box(const Mat4x4d& view_proj) {
  static const auto ndc = ndc_corners();

  // Get all corners of the frustum in world space.
  Eigen::Array<double, 4, 8> p = Eigen::Matrix4d(&view_proj[0]).inverse() * ndc;
  p.block<1, 8>(0, 0) /= p.block<1, 8>(3, 0);
  p.block<1, 8>(1, 0) /= p.block<1, 8>(3, 0);
  p.block<1, 8>(2, 0) /= p.block<1, 8>(3, 0);

  // Compute the minimum coordinate over each point.
  auto lo = p.rowwise().minCoeff();
  auto hi = p.rowwise().maxCoeff();

  return FrustumBounds{
      {lo(0), lo(1), lo(2)},
      {hi(0), hi(1), hi(2)},
  };
}

}  // namespace voxeloo::frustum

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <tuple>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/knn.hpp"

namespace py = pybind11;

namespace voxeloo::voronoi::ext {

template <typename Vec>
inline auto nearest(const std::vector<Vec>& points, const Vec& query) {
  CHECK_ARGUMENT(points.size() > 0);
  uint32_t ret = 0;
  float distance = square_norm(points[0] - query);
  for (uint32_t i = 1; i < points.size(); i += 1) {
    float candidate = square_norm(points[i] - query);
    if (candidate < distance) {
      ret = i;
      distance = candidate;
    }
  }
  return ret;
}

auto rasterize_2d(const std::vector<Vec2f>& points, Vec2i shape) {
  auto ret = py::array_t<uint32_t>({shape.x, shape.y});
  auto acc = ret.template mutable_unchecked<2>();
  for (int x = 0; x < shape.x; x += 1) {
    for (int y = 0; y < shape.y; y += 1) {
      acc(x, y) = nearest(points, vec2(x + 0.5f, y + 0.5f));
    }
  }
  return ret;
}

auto rasterize_3d(const std::vector<Vec3f>& points, Vec3i shape) {
  auto knn = knn::make_bucket_knn(shape, points);
  auto ret = py::array_t<uint32_t>({shape.x, shape.y, shape.z});
  auto acc = ret.template mutable_unchecked<3>();
  for (int x = 0; x < shape.x; x += 1) {
    for (int y = 0; y < shape.y; y += 1) {
      for (int z = 0; z < shape.z; z += 1) {
        acc(x, y, z) = knn.id(vec3(x + 0.5f, y + 0.5f, z + 0.5f));
      }
    }
  }
  return ret;
}

auto rasterize_2d_py(py::array_t<float>& points, std::array<int, 2> shape) {
  CHECK_ARGUMENT(points.ndim() == 2);
  CHECK_ARGUMENT(points.shape(1) == 2);

  // Copy over the points,
  std::vector<Vec2f> points_vec;
  points_vec.reserve(points.shape(0));
  {
    auto acc = points.template unchecked<2>();
    for (int i = 0; i < points.shape(0); i += 1) {
      points_vec.emplace_back(Vec2f{acc(i, 0), acc(i, 1)});
    }
  }

  auto [h, w] = shape;
  return rasterize_2d(points_vec, {h, w});
}

auto rasterize_3d_py(py::array_t<float>& points, std::array<int, 3> shape) {
  CHECK_ARGUMENT(points.ndim() == 2);
  CHECK_ARGUMENT(points.shape(1) == 3);

  // Copy over the points,
  std::vector<Vec3f> points_vec;
  points_vec.reserve(points.shape(0));
  {
    auto acc = points.template unchecked<2>();
    for (int i = 0; i < points.shape(0); i += 1) {
      points_vec.emplace_back(Vec3f{acc(i, 0), acc(i, 1), acc(i, 2)});
    }
  }

  auto [d, h, w] = shape;
  return rasterize_3d(points_vec, {d, h, w});
}

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("voronoi");

  m.def("rasterize_2d", rasterize_2d_py);
  m.def("rasterize_3d", rasterize_3d_py);
}

}  // namespace voxeloo::voronoi::ext

#include "voxeloo/py_ext/rasterization.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <Eigen/Dense>
#include <string>
#include <tuple>

#include "voxeloo/biomes/rasterization.hpp"
#include "voxeloo/common/errors.hpp"

namespace py = pybind11;

namespace voxeloo::rasterization::ext {

using DynamicAttrs = Eigen::VectorXd;

auto py_to_triangles(py::array_t<double> vertices, py::array_t<int> triangles) {
  CHECK_ARGUMENT(triangles.ndim() == 2);
  CHECK_ARGUMENT(vertices.ndim() == 2);
  CHECK_ARGUMENT(vertices.shape(1) > 3);
  auto m = triangles.shape(0);
  auto n = vertices.shape(0);
  auto d = vertices.shape(1) - 3;

  TriangleData<DynamicAttrs> ret;

  // Populate the triangle indices.
  auto t_acc = triangles.template unchecked<2>();
  ret.indices.reserve(3 * m);
  for (int i = 0; i < m; i += 1) {
    ret.indices.emplace_back(t_acc(i, 0));
    ret.indices.emplace_back(t_acc(i, 1));
    ret.indices.emplace_back(t_acc(i, 2));
  }

  // Populate the vertex data.
  auto v_acc = vertices.template unchecked<2>();
  ret.positions.reserve(n);
  ret.attributes.reserve(n);
  for (int i = 0; i < n; i += 1) {
    ret.positions.emplace_back(v_acc(i, 0), v_acc(i, 1), v_acc(i, 2));

    auto attr = DynamicAttrs(d);
    for (int j = 0; j < d; j += 1) {
      attr(j) = v_acc(i, 3 + j);
    }
    ret.attributes.push_back(std::move(attr));
  }

  return ret;
}

auto voxelization_to_py(const Voxelization<DynamicAttrs>& voxelization) {
  CHECK_ARGUMENT(voxelization.size() > 0);
  CHECK_ARGUMENT(voxelization.attributes[0].size() > 0);
  const auto n = static_cast<int>(voxelization.size());
  const auto d = static_cast<int>(voxelization.attributes[0].size());

  auto keys = py::array_t<int>({n, 3});
  auto vals = py::array_t<double>({n, d});

  // Populate the keys.
  auto k_acc = keys.template mutable_unchecked<2>();
  for (int i = 0; i < n; i += 1) {
    for (int j = 0; j < 3; j += 1) {
      k_acc(i, j) = voxelization.coords[i][j];
    }
  }

  // Populate the vals.
  auto v_acc = vals.template mutable_unchecked<2>();
  for (int i = 0; i < n; i += 1) {
    for (int j = 0; j < d; j += 1) {
      v_acc(i, j) = voxelization.attributes[i][j];
    }
  }

  return std::tuple(keys, vals);
}

inline auto infinite_box() {
  auto lo = std::numeric_limits<int>::min();
  auto hi = std::numeric_limits<int>::max();
  return std::array<std::array<int, 3>, 2>{{{lo, lo, lo}, {hi, hi, hi}}};
}

void bind(py::module& m) {
  auto rm = m.def_submodule("rasterization", "Rasterizing triangles");

  rm.def(
      "voxelize_mesh",
      [](pybind11::array_t<double> vertices,
         pybind11::array_t<int> triangles,
         float scale,
         std::string merge_strategy,
         std::array<std::array<int, 3>, 2> bounding_box) {
        auto box = voxels::make_box(bounding_box[0], bounding_box[1]);
        auto triangle_data = py_to_triangles(vertices, triangles);
        if (merge_strategy == "none") {
          return voxelization_to_py(
              to_voxels<DynamicAttrs>(triangle_data, scale, box));
        } else if (merge_strategy == "weighted") {
          return voxelization_to_py(
              to_voxels<DynamicAttrs, LinearReducer<DynamicAttrs>>(
                  triangle_data, scale, box));
        } else if (merge_strategy == "nearest") {
          return voxelization_to_py(
              to_voxels<DynamicAttrs, NearestReducer<DynamicAttrs>>(
                  triangle_data, scale, box));
        } else {
          CHECK_UNREACHABLE("Bad merge strategy. Must be nearest or weighted.");
        }
      },
      py::arg("vertices"),
      py::arg("triangles"),
      py::arg("scale"),
      py::arg("merge_strategy") = "weighted",
      py::arg("bounding_box") = infinite_box());
}

}  // namespace voxeloo::rasterization::ext

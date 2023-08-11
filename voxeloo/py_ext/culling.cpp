#include "voxeloo/biomes/culling.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/py_ext/biomes.hpp"

namespace py = pybind11;

namespace voxeloo::culling::ext {

using Point = std::array<double, 3>;

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("culling");

  // Bind the culling axis-aligned bounding box type.
  py::class_<AABB>(m, "AABB")
      .def(
          py::init([](const Point& v0, const Point& v1) {
            return AABB{v0, v1};
          }),
          py::arg("v0"),
          py::arg("v1"))
      .def_property_readonly(
          "v0",
          [](const AABB& self) {
            return self.v0.array();
          })
      .def_property_readonly("v1", [](const AABB& self) {
        return self.v1.array();
      });

  // Bind the culling OcclusionBuffer type.
  py::class_<OcclusionBuffer>(m, "OcclusionBuffer")
      .def(py::init([](uint32_t w, uint32_t h) {
        return OcclusionBuffer({w, h});
      }))
      .def("get", [](const OcclusionBuffer& self, uint32_t x, uint32_t y) {
        return self.get({x, y});
      });

  // Bind the culling OcclusionBuffer type.
  py::class_<OcclusionCuller>(m, "OcclusionCuller")
      .def(
          py::init([](Mat4x4d proj, const std::array<uint32_t, 2>& shape) {
            return OcclusionCuller(proj, shape);
          }),
          py::arg("proj"),
          py::arg("shape"))
      .def("write", &OcclusionCuller::write)
      .def("test", &OcclusionCuller::test);

  // Bind the rasterization routines.
  m.def("rasterize_aabb_inclusive", rasterize_aabb_inclusive);
  m.def("rasterize_aabb_exclusive", rasterize_aabb_exclusive);
  m.def("rasterize_many_aabb_inclusive", rasterize_many_aabb_inclusive);
  m.def("rasterize_many_aabb_exclusive", rasterize_many_aabb_exclusive);
}

}  // namespace voxeloo::culling::ext

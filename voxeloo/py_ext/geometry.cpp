#include "voxeloo/py_ext/geometry.hpp"

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/common/geometry.hpp"

namespace py = pybind11;

namespace voxeloo::geometry::ext {

template <typename T>
void bindVec2(py::module& m, const char* name) {
  py::class_<Vec2<T>>(m, name)
      .def(py::init<T, T>())
      .def_readwrite("x", &Vec2<T>::x)
      .def_readwrite("y", &Vec2<T>::y)
      .def("tuple", [](const Vec2<T>& self) {
        return self.array();
      });
}

template <typename T>
void bindVec3(py::module& m, const char* name) {
  py::class_<Vec3<T>>(m, name)
      .def(py::init<T, T, T>())
      .def_readwrite("x", &Vec3<T>::x)
      .def_readwrite("y", &Vec3<T>::y)
      .def_readwrite("z", &Vec3<T>::z)
      .def("tuple", [](const Vec3<T>& self) {
        return self.array();
      });
}

template <typename T>
void bindVec4(py::module& m, const char* name) {
  py::class_<Vec4<T>>(m, name)
      .def(py::init<T, T, T, T>())
      .def_readwrite("x", &Vec4<T>::x)
      .def_readwrite("y", &Vec4<T>::y)
      .def_readwrite("z", &Vec4<T>::z)
      .def_readwrite("w", &Vec4<T>::w)
      .def("tuple", [](const Vec4<T>& self) {
        return self.array();
      });
}

void bind(py::module& m) {
  auto gm = m.def_submodule("geometry", "Basic voxel types");

  bindVec2<unsigned int>(gm, "Vec2u");
  bindVec3<unsigned int>(gm, "Vec3u");
  bindVec4<unsigned int>(gm, "Vec4u");

  bindVec2<int>(gm, "Vec2i");
  bindVec3<int>(gm, "Vec3i");
  bindVec4<int>(gm, "Vec4i");

  bindVec2<bool>(gm, "Vec2b");
  bindVec3<bool>(gm, "Vec3b");
  bindVec4<bool>(gm, "Vec4b");

  bindVec2<float>(gm, "Vec2f");
  bindVec3<float>(gm, "Vec3f");
  bindVec4<float>(gm, "Vec4f");

  bindVec2<double>(gm, "Vec2d");
  bindVec3<double>(gm, "Vec3d");
  bindVec4<double>(gm, "Vec4d");
}

}  // namespace voxeloo::geometry::ext
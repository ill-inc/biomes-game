#include "voxeloo/py_ext/runs.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <cstdint>
#include <unordered_map>

#include "voxeloo/common/runs.hpp"

namespace py = pybind11;

namespace voxeloo::runs::ext {

template <typename Val>
void bind_index(py::module& m, const char* name) {
  using T = runs::Index<Val>;
  py::class_<T>(m, name)
      .def(py::init<>())
      .def("size", &T::size)
      .def("get", &T::get)
      .def(
          "loads",
          [](T& self, std::string blob) {
            transport::from_blob(self, std::move(blob));
          })
      .def(
          "dumps",
          [](const T& self) {
            return py::bytes(transport::to_blob(self));
          })
      .def("storage_size", &T::storage_size);
}

template <typename Val>
void bind_builder(py::module& m, const char* name) {
  using T = runs::IndexBuilder<Val>;
  py::class_<T>(m, name)
      .def(py::init<Pos, Val>())
      .def(
          "add",
          [](T& self, std::array<Pos, 2>& span, Val val) {
            return self.add({span[0], span[1]}, val);
          })
      .def(
          "add",
          [](T& self, Pos pos, Val val) {
            return self.add(pos, val);
          })
      .def("build", [](const T& self) {
        return self.build();
      });
}

void bind(py::module& m) {
  auto rm = m.def_submodule("runs");

  bind_index<int8_t>(rm, "Index_I8");
  bind_index<int16_t>(rm, "Index_I16");
  bind_index<int32_t>(rm, "Index_I32");
  bind_index<int64_t>(rm, "Index_I64");
  bind_index<uint8_t>(rm, "Index_U8");
  bind_index<uint16_t>(rm, "Index_U16");
  bind_index<uint32_t>(rm, "Index_U32");
  bind_index<uint64_t>(rm, "Index_U64");

  bind_builder<int8_t>(rm, "IndexBuilder_I8");
  bind_builder<int16_t>(rm, "IndexBuilder_I16");
  bind_builder<int32_t>(rm, "IndexBuilder_I32");
  bind_builder<int64_t>(rm, "IndexBuilder_I64");
  bind_builder<uint8_t>(rm, "IndexBuilder_U8");
  bind_builder<uint16_t>(rm, "IndexBuilder_U16");
  bind_builder<uint32_t>(rm, "IndexBuilder_U32");
  bind_builder<uint64_t>(rm, "IndexBuilder_U64");
}

}  // namespace voxeloo::runs::ext

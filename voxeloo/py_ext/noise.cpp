#include "voxeloo/py_ext/noise.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/biomes/noise.hpp"
#include "voxeloo/common/errors.hpp"

namespace py = pybind11;

namespace voxeloo::noise::ext {

inline auto noise(const SimplexNoise& gen, const py::array_t<float>& pos) {
  CHECK_ARGUMENT(pos.ndim() == 2);

  auto len = pos.shape(0);
  auto dim = pos.shape(1);
  CHECK_ARGUMENT(dim == 2 || dim == 3 || dim == 4);

  auto ret = py::array_t<float>(len);
  auto src = pos.template unchecked<2>();
  auto dst = ret.template mutable_unchecked<1>();
  for (uint32_t i = 0; i < len; i += 1) {
    if (dim == 2) {
      dst(i) = gen.get(src(i, 0), src(i, 1));
    } else if (dim == 3) {
      dst(i) = gen.get(src(i, 0), src(i, 1), src(i, 2));
    } else if (dim == 4) {
      dst(i) = gen.get(src(i, 0), src(i, 1), src(i, 2), src(i, 3));
    }
  }

  return ret;
}

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("noise");

  py::class_<SimplexNoise>(m, "SimplexNoise")
      .def(py::init<uint32_t>())
      .def("noise", &noise);

  m.def("noise", [gen = SimplexNoise(1)](const py::array_t<float>& domain) {
    return noise(gen, domain);
  });
}

}  // namespace voxeloo::noise::ext

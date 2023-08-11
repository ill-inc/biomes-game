#pragma once

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>

namespace voxeloo::primitives::ext {

void bind(pybind11::module& m);

}  // namespace voxeloo::primitives::ext

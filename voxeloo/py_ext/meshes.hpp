#pragma once

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>

#include "voxeloo/common/meshes.hpp"

namespace voxeloo::meshes::ext {

Mesh py_to_mesh(pybind11::object py_obj);
pybind11::object mesh_to_py(const Mesh& mesh);

void bind(pybind11::module& m);

}  // namespace voxeloo::meshes::ext

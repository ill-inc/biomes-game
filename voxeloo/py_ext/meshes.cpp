#include "voxeloo/py_ext/meshes.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <cmath>
#include <fstream>
#include <optional>
#include <stdexcept>

#include "voxeloo/biomes/rasterization.hpp"
#include "voxeloo/common/blocks.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/meshes.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/threads.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/third_party/tomasakeninemoeller/tribox3.h"

namespace py = pybind11;

namespace {
struct MeshPy {
  py::array_t<float> vertices;
  py::array_t<int> triangles;
};
}  // namespace

namespace voxeloo::meshes::ext {

Mesh py_to_mesh(py::object py_obj) {
  Mesh ret;

  auto mesh = py::cast<MeshPy>(py_obj);
  CHECK_STATE(mesh.vertices.ndim() == 2);
  CHECK_STATE(mesh.triangles.ndim() == 2);

  // Copy over the vertices
  auto n_ver = mesh.vertices.shape(0);
  auto v_acc = mesh.vertices.unchecked<2>();
  ret.vertices.reserve(n_ver);
  for (int i = 0; i < n_ver; i += 1) {
    ret.vertices.emplace_back(Vertex{
        {v_acc(i, 0), v_acc(i, 1), v_acc(i, 2)},
        {v_acc(i, 3), v_acc(i, 4), v_acc(i, 5)},
    });
  }

  // Copy over the triangle indices
  auto n_tri = mesh.triangles.shape(0);
  auto t_acc = mesh.triangles.unchecked<2>();
  ret.indices.reserve(3 * n_tri);
  for (int i = 0; i < n_tri; i += 1) {
    ret.indices.push_back(t_acc(i, 0));
    ret.indices.push_back(t_acc(i, 1));
    ret.indices.push_back(t_acc(i, 2));
  }

  return ret;
}

py::object mesh_to_py(const Mesh& mesh) {
  // Count the total number of vertices and triangles.
  int n_ver = static_cast<int>(mesh.vertices.size());
  int n_tri = static_cast<int>(mesh.indices.size() / 3);

  // Allocate the output arrays.
  MeshPy ret;
  ret.vertices = py::array_t<float>({n_ver, 6});
  ret.triangles = py::array_t<int>({n_tri, 3});

  // Append all vertices.
  auto v_acc = ret.vertices.mutable_unchecked<2>();
  for (int i = 0; i < n_ver; i += 1) {
    auto [x, y, z] = mesh.vertices.at(i).xyz;
    auto [r, g, b] = mesh.vertices.at(i).rgb;
    v_acc(i, 0) = x;
    v_acc(i, 1) = y;
    v_acc(i, 2) = z;
    v_acc(i, 3) = r;
    v_acc(i, 4) = g;
    v_acc(i, 5) = b;
  }

  // Append all triangles.
  auto t_acc = ret.triangles.mutable_unchecked<2>();
  for (int i = 0; i < n_tri; i += 1) {
    t_acc(i, 0) = mesh.indices.at(3 * i);
    t_acc(i, 1) = mesh.indices.at(3 * i + 1);
    t_acc(i, 2) = mesh.indices.at(3 * i + 2);
  }

  return py::cast(std::move(ret));
}

void bind(py::module& m) {
  auto mm = m.def_submodule("meshes", "Simple mesh type");

  // Bind interfacing mesh structure.
  py::class_<MeshPy>(mm, "Mesh")
      .def(py::init<>())
      .def_readwrite("vertices", &MeshPy::vertices)
      .def_readwrite("triangles", &MeshPy::triangles)
      .def_static(
          "loads",
          [](const std::string& bytes) {
            return mesh_to_py(transport::from_compressed_blob<Mesh>(bytes));
          })
      .def(
          "dumps",
          [](const MeshPy& m) {
            auto blob = transport::to_compressed_blob(py_to_mesh(py::cast(m)));
            return py::bytes(std::move(blob));
          })
      .def(
          "to_blocks",
          [](const MeshPy& m, float q) {
            auto voxels = rasterization::to_voxels(py_to_mesh(py::cast(m)), q);
            blocks::BlockBuilder<RGBA> builder(q);
            for (size_t i = 0; i < voxels.size(); i += 1) {
              auto [x, y, z] = voxels.coords[i];
              auto [r, g, b] = voxels.attributes[i].to<float>().array();
              builder.add(x, y, z, colors::to_rgba(r, g, b, 1.0f));
            }
            return std::move(builder).build();
          },
          py::arg("quantization") = 1.0f);
}

}  // namespace voxeloo::meshes::ext

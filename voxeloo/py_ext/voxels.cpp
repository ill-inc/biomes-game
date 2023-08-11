#include "voxeloo/py_ext/voxels.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/meshes.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/py_ext/meshes.hpp"

namespace py = pybind11;

namespace voxeloo::voxels::ext {

auto voxels_to_mesh(const py::array_t<RGBA>& vals) {
  CHECK_ARGUMENT(vals.ndim() == 3);
  auto d = static_cast<int>(vals.shape(0));
  auto h = static_cast<int>(vals.shape(1));
  auto w = static_cast<int>(vals.shape(2));
  auto acc = vals.template unchecked<3>();

  // Populate the block builder with the non-empty array values.
  voxels::Box box = {{0, 0, 0}, {w, h, d}};
  voxels::VoxelQuadifier<RGBA> quadifier;
  for (int z = 0; z < d; z += 1) {
    for (int y = 0; y < h; y += 1) {
      for (int x = 0; x < w; x += 1) {
        if (auto val = acc(z, y, x); val) {
          quadifier.push(x, y, z, val, [&](Vec3i pos) {
            if (voxels::box_contains(box, pos)) {
              return !acc(pos.z, pos.y, pos.x);
            }
            return true;
          });
        }
      }
    }
  }

  meshes::Mesh mesh;

  // Output the mesh geometry.
  int offset = 0;
  for (const auto& [p, q] : quadifier.build()) {
    auto mat = p.key;
    auto emit_vertex = [&](int x, int y, int z) {
      auto pos = vec3(x, y, z).to<float>();
      auto rgb = colors::to_floats<Vec4f>(mat).xyz();
      mesh.vertices.emplace_back(meshes::Vertex{pos, rgb});
    };

    if (p.dir == voxels::X_NEG) {
      emit_vertex(p.lvl, q.v0.y, q.v0.x);
      emit_vertex(p.lvl, q.v0.y, q.v1.x);
      emit_vertex(p.lvl, q.v1.y, q.v1.x);
      emit_vertex(p.lvl, q.v1.y, q.v0.x);
    }
    if (p.dir == voxels::X_POS) {
      emit_vertex(p.lvl, q.v0.y, q.v1.x);
      emit_vertex(p.lvl, q.v0.y, q.v0.x);
      emit_vertex(p.lvl, q.v1.y, q.v0.x);
      emit_vertex(p.lvl, q.v1.y, q.v1.x);
    }
    if (p.dir == voxels::Y_NEG) {
      emit_vertex(q.v0.x, p.lvl, q.v0.y);
      emit_vertex(q.v1.x, p.lvl, q.v0.y);
      emit_vertex(q.v1.x, p.lvl, q.v1.y);
      emit_vertex(q.v0.x, p.lvl, q.v1.y);
    }
    if (p.dir == voxels::Y_POS) {
      emit_vertex(q.v0.x, p.lvl, q.v0.y);
      emit_vertex(q.v0.x, p.lvl, q.v1.y);
      emit_vertex(q.v1.x, p.lvl, q.v1.y);
      emit_vertex(q.v1.x, p.lvl, q.v0.y);
    }
    if (p.dir == voxels::Z_NEG) {
      emit_vertex(q.v0.x, q.v0.y, p.lvl);
      emit_vertex(q.v0.x, q.v1.y, p.lvl);
      emit_vertex(q.v1.x, q.v1.y, p.lvl);
      emit_vertex(q.v1.x, q.v0.y, p.lvl);
    }
    if (p.dir == voxels::Z_POS) {
      emit_vertex(q.v0.x, q.v0.y, p.lvl);
      emit_vertex(q.v1.x, q.v0.y, p.lvl);
      emit_vertex(q.v1.x, q.v1.y, p.lvl);
      emit_vertex(q.v0.x, q.v1.y, p.lvl);
    }

    for (const auto i : voxels::face_indices()) {
      mesh.indices.emplace_back(offset + i);
    }

    offset += 4;
  }

  return meshes::ext::mesh_to_py(mesh);
}

void bind(py::module& m) {
  auto vm = m.def_submodule("voxels", "Basic voxel types");

  py::enum_<Dir>(vm, "Dir")
      .value("X_NEG", Dir::X_NEG)
      .value("X_POS", Dir::X_POS)
      .value("Y_NEG", Dir::Y_NEG)
      .value("Y_POS", Dir::Y_POS)
      .value("Z_NEG", Dir::Z_NEG)
      .value("Z_POS", Dir::Z_POS)
      .export_values();

  py::class_<Box>(vm, "Box")
      .def(
          py::init(
              [](const std::array<int, 3>& v0, const std::array<int, 3>& v1) {
                return Box{v0, v1};
              }),
          py::arg("v0"),
          py::arg("v1"))
      .def_property(
          "v0",
          [](const Box& self) {
            return self.v0.array();
          },
          [](Box& self, const std::array<int, 3>& v) {
            self.v0 = v;
          })
      .def_property(
          "v1",
          [](const Box& self) {
            return self.v1.array();
          },
          [](Box& self, const std::array<int, 3>& v) {
            self.v1 = v;
          })
      .def(
          "numpy",
          [](const Box& self) {
            auto ret = py::array_t<int>({2, 3});
            auto acc = ret.mutable_unchecked<2>();
            acc(0, 1) = self.v0.x;
            acc(0, 2) = self.v0.y;
            acc(0, 3) = self.v0.z;
            acc(1, 1) = self.v1.x;
            acc(1, 2) = self.v1.y;
            acc(1, 3) = self.v1.z;
            return ret;
          })
      .def("__repr__", [](const Box& self) {
        return stringify("[", self.v0.str(), ", ", self.v1.str(), "]");
      });

  vm.def("voxels_to_mesh", &voxels_to_mesh);
}

}  // namespace voxeloo::voxels::ext

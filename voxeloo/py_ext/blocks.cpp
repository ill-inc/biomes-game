#include "voxeloo/py_ext/blocks.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/common/blocks.hpp"
#include "voxeloo/common/colors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/py_ext/meshes.hpp"

namespace py = pybind11;

namespace voxeloo::blocks::ext {

namespace {
template <typename Val>
auto to_numpy(const BlockList<Val>& bl, Val empty = 0) {
  auto aabb = bounding_box(bl);
  auto [w, h, d] = voxels::box_size(aabb);

  // Copy each box element to an numpy array.
  auto ret = py::array_t<Val>({d, h, w});
  auto acc = ret.template mutable_unchecked<3>();

  // Initialize the array to the empty value.
  for (int z = 0; z < d; z += 1) {
    for (int y = 0; y < h; y += 1) {
      for (int x = 0; x < w; x += 1) {
        acc(z, y, x) = empty;
      }
    }
  }

  // Copy over the values in the block list.
  for_each(bl, [&](int bx, int by, int bz, Val v) {
    auto x = bx - aabb.v0[0];
    auto y = by - aabb.v0[1];
    auto z = bz - aabb.v0[2];
    acc(z, y, x) = std::move(v);
  });

  return ret;
}

template <typename Val>
auto from_numpy(
    const py::array_t<Val>& vals, float scale, Vec3i shift, Val empty = 0) {
  CHECK_ARGUMENT(vals.ndim() == 3);
  auto d = vals.shape(0);
  auto h = vals.shape(1);
  auto w = vals.shape(2);
  auto acc = vals.template unchecked<3>();

  // Populate the block builder with the non-empty array values.
  BlockBuilder<Val> builder(scale);
  for (int z = 0; z < d; z += 1) {
    for (int y = 0; y < h; y += 1) {
      for (int x = 0; x < w; x += 1) {
        auto [bx, by, bz] = vec3(x, y, z) + shift;
        if (auto val = acc(z, y, x); val != empty) {
          builder.add(bx, by, bz, val);
        }
      }
    }
  }

  return std::move(builder).build();
}

template <typename Val>
auto to_sparse_numpy(const BlockList<Val>& bl) {
  const auto n = static_cast<int>(size(bl));
  auto keys = py::array_t<int>({n, 3});
  auto vals = py::array_t<Val>(n);

  auto k_acc = keys.template mutable_unchecked<2>();
  auto v_acc = vals.template mutable_unchecked<1>();
  for_each(bl, [&, i = 0](int x, int y, int z, Val val) mutable {
    k_acc(i, 0) = x;
    k_acc(i, 1) = y;
    k_acc(i, 2) = z;
    v_acc(i) = std::move(val);
    i += 1;
  });

  return std::tuple(keys, vals, bl.scale);
}

template <typename Val>
auto from_sparse_numpy(
    const py::array_t<int>& keys, const py::array_t<Val>& vals, float scale) {
  CHECK_ARGUMENT(keys.ndim() == 2);
  CHECK_ARGUMENT(vals.ndim() == 1);
  CHECK_ARGUMENT(keys.shape(1) == 3);
  CHECK_ARGUMENT(vals.shape(0) == keys.shape(0));

  const auto n = keys.shape(0);
  auto k_acc = keys.template unchecked<2>();
  auto v_acc = vals.template unchecked<1>();

  // Populate the block builder with the non-empty array values.
  BlockBuilder<Val> builder(scale);
  for (int i = 0; i < n; i += 1) {
    builder.add(k_acc(i, 0), k_acc(i, 1), k_acc(i, 2), v_acc(i));
  }

  return std::move(builder).build();
}
}  // namespace

template <typename Val>
inline void bind_block_list(py::module& m, const char* name) {
  using BL = BlockList<Val>;
  py::class_<BL>(m, name)
      .def(py::init<>())
      .def_readonly("scale", &BL::scale)
      .def(
          "__getitem__",
          [](const BL& bl, int x, int y, int z) {
            return BlockReader<Val>(bl).get(x, y, z);
          })
      .def(
          "dumps",
          [](const BL& bl, bool compressed) {
            if (compressed) {
              return py::bytes(transport::to_compressed_blob(bl));
            } else {
              return py::bytes(transport::to_blob(bl));
            }
          },
          py::arg("compressed") = true)
      .def_static(
          "loads",
          [](const std::string& bytes, bool compressed) {
            if (compressed) {
              return transport::from_compressed_blob<BL>(bytes);
            } else {
              return transport::from_blob<BL>(bytes);
            }
          },
          py::arg("bytes"),
          py::arg("compressed") = true)
      .def(
          "mesh",
          [](const BL& bl) {
            return meshes::ext::mesh_to_py(meshes::emit_mesh(bl));
          })
      .def(
          "shift",
          [](const BL& bl) {
            return bounding_box(bl).v0;
          })
      .def(
          "bounding_box",
          [](const BL& bl) {
            auto box = bounding_box(bl);
            return std::tuple(box.v0, box.v1);
          })
      .def(
          "to_json",
          [](const BL& bl) {
            return transport::to_json(bl);
          })
      .def(
          "from_json",
          [](const std::string& json) {
            return transport::from_json<BL>(json);
          })
      .def(
          "to_numpy",
          [](const BL& bl) {
            return to_numpy<Val>(bl);
          })
      .def_static(
          "from_numpy",
          [](py::array_t<Val> vals, float scale, std::array<int, 3> shift) {
            return from_numpy(vals, scale, shift);
          },
          py::arg("vals"),
          py::arg("scale") = 1.0f,
          py::arg("shift") = std::array<int, 3>{0, 0, 0})
      .def(
          "to_sparse_numpy",
          [](const BL& bl) {
            return to_sparse_numpy<Val>(bl);
          })
      .def_static(
          "from_sparse_numpy",
          [](py::array_t<int> coords, py::array_t<Val> vals, float scale) {
            return from_sparse_numpy(coords, vals, scale);
          },
          py::arg("coords"),
          py::arg("vals"),
          py::arg("scale") = 1.0f)
      .def("clone", [](const BL& bl) {
        return transport::from_blob<BL>(transport::to_blob(bl));
      });
}

void bind(py::module& m) {
  auto bm = m.def_submodule("blocks", "Simple sparse 3D color arrays");
  bind_block_list<RGBA>(bm, "BlockList");
}

}  // namespace voxeloo::blocks::ext

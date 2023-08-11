#include "voxeloo/py_ext/spatial.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <cstdint>
#include <unordered_map>

#include "voxeloo/common/blocks.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/spatial.hpp"
#include "voxeloo/common/voxels.hpp"

namespace py = pybind11;

namespace voxeloo::spatial::ext {

namespace {

template <typename Val>
auto bounding_box(const spatial::Index<Val>& map) {
  auto bb = voxels::empty_box();
  map.scan([&](auto pos, ATTR_UNUSED const Val& _) {
    bb = voxels::union_box(bb, voxels::unit_box(pos));
  });
  return bb;
}

template <typename Val>
auto to_numpy(const spatial::Index<Val>& map, Val empty = 0) {
  auto aabb = bounding_box(map);
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
  map.scan([&](Vec3i pos, Val v) {
    auto [x, y, z] = pos - aabb.v0;
    acc(z, y, x) = std::move(v);
  });

  return ret;
}
}  // namespace

void bind(py::module& m) {
  auto sm = m.def_submodule("spatial");

  using DensityMap = spatial::Index<float>;
  py::class_<DensityMap>(sm, "DensityMap")
      .def(py::init<>())
      .def(
          "has",
          [](const DensityMap& dm, int x, int y, int z) {
            return dm.access().has(x, y, z);
          })
      .def(
          "get",
          [](const DensityMap& dm, int x, int y, int z) {
            return dm.access().get(x, y, z);
          })
      .def(
          "bounding_box",
          [](const DensityMap& dm) {
            auto bb = bounding_box(dm);
            return std::tuple(bb.v0, bb.v1);
          })
      .def(
          "numpy",
          [](const DensityMap& dm) {
            return to_numpy(dm);
          })
      .def(
          "blocks",
          [](const DensityMap& dm, float threshold, RGBA color) {
            blocks::BlockBuilder<RGBA> builder(1.0f);
            dm.scan([&](auto pos, float density) {
              if (density >= threshold) {
                builder.add(pos.x, pos.y, pos.z, color);
              }
            });
            return std::move(builder).build();
          },
          py::arg("threshold") = 0.5f,
          py::arg("color") = colors::white())
      .def(
          "values",
          [](const DensityMap& dm) {
            std::vector<std::tuple<int, int, int, float>> ret;
            dm.scan([&](auto pos, float density) {
              ret.emplace_back(pos.x, pos.y, pos.z, density);
            });
            return ret;
          })
      .def(
          "update",
          [](DensityMap& dm,
             std::vector<std::tuple<int, int, int, float>> vals) {
            std::vector<std::tuple<Vec3i, float>> update;
            update.reserve(vals.size());
            for (auto [x, y, z, v] : vals) {
              update.push_back({{x, y, z}, v});
            }
            dm.update(update);
          });

  using ColorMap = spatial::Index<RGBA>;
  py::class_<ColorMap>(sm, "ColorMap")
      .def(py::init<>())
      .def(
          "has",
          [](const ColorMap& cm, int x, int y, int z) {
            return cm.access().has(x, y, z);
          })
      .def(
          "get",
          [](const ColorMap& cm, int x, int y, int z) {
            return cm.access().get(x, y, z);
          })
      .def(
          "bounding_box",
          [](const ColorMap& cm) {
            auto bb = voxels::empty_box();
            cm.scan([&](auto pos, ATTR_UNUSED RGBA color) {
              bb = voxels::union_box(bb, voxels::unit_box(pos));
            });
            return std::tuple(bb.v0, bb.v1);
          })
      .def(
          "numpy",
          [](const ColorMap& cm) {
            return to_numpy(cm);
          })
      .def(
          "blocks",
          [](const ColorMap& dm) {
            blocks::BlockBuilder<RGBA> builder(1.0f);
            dm.scan([&](auto pos, RGBA color) {
              builder.add(pos.x, pos.y, pos.z, color);
            });
            return std::move(builder).build();
          })
      .def(
          "values",
          [](const ColorMap& cm) {
            std::vector<std::tuple<int, int, int, RGBA>> ret;
            cm.scan([&](auto pos, RGBA color) {
              ret.emplace_back(pos.x, pos.y, pos.z, color);
            });
            return ret;
          })
      .def(
          "update",
          [](ColorMap& cm, std::vector<std::tuple<int, int, int, RGBA>> vals) {
            std::vector<std::tuple<Vec3i, RGBA>> update;
            update.reserve(vals.size());
            for (auto [x, y, z, v] : vals) {
              update.push_back({{x, y, z}, v});
            }
            cm.update(update);
          });
}

}  // namespace voxeloo::spatial::ext

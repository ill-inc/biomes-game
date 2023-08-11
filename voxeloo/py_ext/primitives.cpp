#include "voxeloo/py_ext/primitives.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <memory>
#include <string>
#include <tuple>

#include "voxeloo/biomes/primitives.hpp"
#include "voxeloo/common/errors.hpp"

namespace py = pybind11;

namespace voxeloo::primitives::ext {

namespace {
auto zeros(std::array<int, 2> shape) {
  auto ret = py::array_t<float>(shape);
  auto acc = ret.mutable_unchecked<2>();
  for (int y = 0; y < shape[0]; y += 1) {
    for (int x = 0; x < shape[1]; x += 1) {
      acc(y, x) = 0.0f;
    }
  }
  return ret;
}

auto zeros(std::array<int, 3> shape) {
  auto ret = py::array_t<float>(shape);
  auto acc = ret.mutable_unchecked<3>();
  for (int z = 0; z < shape[0]; z += 1) {
    for (int y = 0; y < shape[1]; y += 1) {
      for (int x = 0; x < shape[2]; x += 1) {
        acc(z, y, x) = 0.0f;
      }
    }
  }
  return ret;
}
}  // namespace

void bind_2d(py::module& pm) {
  using namespace xy;
  using NodePtr = std::shared_ptr<Node>;

  auto m = pm.def_submodule("xy", "2-dimensional primitives");

  auto node = py::class_<Node, NodePtr>(m, "Node");
  node.def("get", [](const Node& self, float x, float y) {
    return self.get({x, y});
  });

  m.def("make_disk", [](float r) -> NodePtr {
    return std::make_shared<Disk>(r);
  });
  m.def("make_rect", [](float w, float h) -> NodePtr {
    return std::make_shared<Rect>(Vec2f{w, h});
  });

  m.def(
      "transform",
      [](NodePtr child, std::array<float, 2> t, float r) -> NodePtr {
        return std::make_shared<Transformed>(child, t, r);
      });
  m.def("union", [](std::vector<NodePtr> nodes) -> NodePtr {
    return std::make_shared<Union>(std::move(nodes));
  });

  m.def(
      "rasterize",
      [](NodePtr node, std::array<int, 2>& shape, float threshold) {
        auto ret = zeros(shape);
        auto acc = ret.mutable_unchecked<2>();
        for (const auto& [x, y, v] : rasterize(node, shape, threshold)) {
          acc(y, x) = v;
        }
        return ret;
      },
      py::arg("node"),
      py::arg("shape"),
      py::arg("threshold") = 1e-3f);
}

void bind_3d(py::module& pm) {
  using namespace xyz;
  using NodePtr = std::shared_ptr<Node>;

  auto m = pm.def_submodule("xyz", "3-dimensional primitives");

  auto node = py::class_<Node, NodePtr>(m, "Node");
  node.def("get", [](const Node& self, float x, float y, float z) {
    return self.get({x, y, z});
  });

  m.def("make_ball", [](float r) -> NodePtr {
    return std::make_shared<Ball>(r);
  });
  m.def("make_box", [](float w, float h, float d) -> NodePtr {
    return std::make_shared<Box>(Vec3f{w, h, d});
  });

  m.def(
      "transform",
      [](std::shared_ptr<Node> child,
         std::array<float, 3> t,
         std::array<float, 4> r) -> NodePtr {
        return std::make_shared<Transformed>(child, t, r);
      });
  m.def("union", [](std::vector<std::shared_ptr<Node>> nodes) -> NodePtr {
    return std::make_shared<Union>(std::move(nodes));
  });

  m.def(
      "rasterize",
      [](NodePtr node, std::array<int, 3>& shape, float threshold) {
        auto ret = zeros(shape);
        auto acc = ret.mutable_unchecked<3>();
        for (const auto& [x, y, z, v] : rasterize(node, shape, threshold)) {
          acc(z, y, x) = v;
        }
        return ret;
      },
      py::arg("node"),
      py::arg("shape"),
      py::arg("threshold") = 1e-3);
}

void bind(py::module& m) {
  auto pm = m.def_submodule("primitives", "Procedural content generation lib");
  bind_2d(pm);
  bind_3d(pm);
}

}  // namespace voxeloo::primitives::ext

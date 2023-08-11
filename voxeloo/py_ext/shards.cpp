#include "voxeloo/py_ext/shards.hpp"

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/biomes/shards.hpp"

namespace py = pybind11;

namespace voxeloo::shards::ext {

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("shards");
  m.def("shard_encode", [](uint8_t lvl, int x, int y, int z) {
    return shards::shard_encode<std::string>({lvl, {x, y, z}});
  });
  m.def("shard_decode", [](const std::string& code) {
    auto [level, pos] = shards::shard_decode(code);
    return std::tuple(level, pos.x, pos.y, pos.z);
  });
}

}  // namespace voxeloo::shards::ext

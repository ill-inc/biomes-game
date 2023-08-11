#include "voxeloo/py_ext/biomes.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/biomes/biomes.hpp"

namespace py = pybind11;

namespace voxeloo::biomes::ext {

template <typename T>
inline auto volume_block_from_numpy(const py::array_t<T>& array) {
  CHECK_ARGUMENT(array.ndim() == 3);
  CHECK_ARGUMENT(array.shape(0) == 32);
  CHECK_ARGUMENT(array.shape(1) == 32);
  CHECK_ARGUMENT(array.shape(2) == 32);

  VolumeBlock<T> block;
  auto acc = array.template unchecked<3>();
  for (int z = 0; z < 32; z += 1) {
    for (int y = 0; y < 32; y += 1) {
      for (int x = 0; x < 32; x += 1) {
        block.set(x, y, z, acc(z, y, x));
      }
    }
  }
  block.compact();
  return block;
}

template <typename T>
inline auto numpy_from_volume_block(const VolumeBlock<T>& block) {
  auto ret = py::array_t<T>({32, 32, 32});
  auto acc = ret.template mutable_unchecked<3>();
  for (int z = 0; z < 32; z += 1) {
    for (int y = 0; y < 32; y += 1) {
      for (int x = 0; x < 32; x += 1) {
        acc(z, y, x) = block.get(x, y, z);
      }
    }
  }
  return ret;
}

template <typename Val>
void bind_volume_block(py::module& m, const char* name) {
  using Pos = std::array<uint32_t, 3>;
  py::class_<VolumeBlock<Val>>(m, name)
      .def(py::init<>())
      .def(
          "__getitem__",
          [](const VolumeBlock<Val>& self, const Pos& pos) {
            auto [x, y, z] = pos;
            return self.get(x, y, z);
          })
      .def(
          "__setitem__",
          [](VolumeBlock<Val>& self, const Pos& pos, Val val) {
            auto [x, y, z] = pos;
            self.set(x, y, z, val);
          })
      .def("assign", &VolumeBlock<Val>::assign)
      .def(
          "dumps",
          [](const VolumeBlock<Val>& self) {
            return transport::to_base64(transport::to_compressed_blob(self));
          })
      .def(
          "loads",
          [](VolumeBlock<Val>& self, std::string blob) {
            auto decoded = transport::from_base64(blob);
            return transport::from_compressed_blob(self, decoded);
          })
      .def(
          "compressed_dumps",
          [](const VolumeBlock<Val>& self) {
            return py::bytes(transport::to_compressed_blob(self));
          })
      .def(
          "compressed_loads",
          [](VolumeBlock<Val>& self, std::string blob) {
            return transport::from_compressed_blob(self, std::move(blob));
          })
      .def(
          "raw_dumps",
          [](const VolumeBlock<Val>& self) {
            return py::bytes(transport::to_blob(self));
          })
      .def(
          "raw_loads",
          [](VolumeBlock<Val>& self, std::string blob) {
            return transport::from_blob(self, std::move(blob));
          })
      .def(
          "array",
          [](const VolumeBlock<Val>& block) {
            return numpy_from_volume_block<Val>(block);
          })
      .def_static("fromarray", [](py::array_t<Val> array) {
        return volume_block_from_numpy<Val>(array);
      });
}

template <typename Val>
void bind_sparse_block(py::module& m, const char* name) {
  using Pos = std::array<uint32_t, 3>;
  py::class_<SparseBlock<Val>>(m, name)
      .def(py::init<>())
      .def(
          "__getitem__",
          [](const SparseBlock<Val>& self, const Pos& pos) {
            auto [x, y, z] = pos;
            return self.get(x, y, z);
          })
      .def(
          "__setitem__",
          [](SparseBlock<Val>& self, const Pos& pos, Val val) {
            auto [x, y, z] = pos;
            self.set(x, y, z, val);
          })
      .def(
          "dumps",
          [](const SparseBlock<Val>& self) {
            return transport::to_base64(transport::to_compressed_blob(self));
          })
      .def(
          "loads",
          [](SparseBlock<Val>& self, std::string blob) {
            auto decoded = transport::from_base64(blob);
            return transport::from_compressed_blob(self, decoded);
          })
      .def(
          "compressed_dumps",
          [](const SparseBlock<Val>& self) {
            return py::bytes(transport::to_compressed_blob(self));
          })
      .def(
          "compressed_loads",
          [](SparseBlock<Val>& self, std::string blob) {
            return transport::from_compressed_blob(self, std::move(blob));
          })
      .def(
          "raw_dumps",
          [](const SparseBlock<Val>& self) {
            return py::bytes(transport::to_blob(self));
          })
      .def(
          "raw_loads",
          [](SparseBlock<Val>& self, std::string blob) {
            return transport::from_blob(self, std::move(blob));
          })
      .def("values", [](const SparseBlock<Val>& block) {
        std::vector<std::tuple<int, int, int, Val>> ret;
        ret.reserve(block.size());
        block.scan([&](auto x, auto y, auto z, auto val) {
          ret.push_back({x, y, z, val});
        });
        return ret;
      });
}

void bind(py::module& vox_module) {
  auto m = vox_module.def_submodule("biomes");

  // Bind volume blocks.
  bind_volume_block<bool>(m, "VolumeBlock_Bool");
  bind_volume_block<int8_t>(m, "VolumeBlock_I8");
  bind_volume_block<int16_t>(m, "VolumeBlock_I16");
  bind_volume_block<int32_t>(m, "VolumeBlock_I32");
  bind_volume_block<int64_t>(m, "VolumeBlock_I64");
  bind_volume_block<uint8_t>(m, "VolumeBlock_U8");
  bind_volume_block<uint16_t>(m, "VolumeBlock_U16");
  bind_volume_block<uint32_t>(m, "VolumeBlock_U32");
  bind_volume_block<uint64_t>(m, "VolumeBlock_U64");

  // Bind sparse blocks.
  bind_sparse_block<bool>(m, "SparseBlock_Bool");
  bind_sparse_block<int8_t>(m, "SparseBlock_I8");
  bind_sparse_block<int16_t>(m, "SparseBlock_I16");
  bind_sparse_block<int32_t>(m, "SparseBlock_I32");
  bind_sparse_block<int64_t>(m, "SparseBlock_I64");
  bind_sparse_block<uint8_t>(m, "SparseBlock_U8");
  bind_sparse_block<uint16_t>(m, "SparseBlock_U16");
  bind_sparse_block<uint32_t>(m, "SparseBlock_U32");
  bind_sparse_block<uint64_t>(m, "SparseBlock_U64");
}

}  // namespace voxeloo::biomes::ext

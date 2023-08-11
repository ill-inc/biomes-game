#include "voxeloo/py_ext/tensors.hpp"

#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace py = pybind11;

namespace voxeloo::tensors::ext {

template <typename T>
inline auto ctor(std::array<uint32_t, 3> shape, T fill) {
  return make_tensor(Vec3u(shape), fill);
}

template <typename T>
inline auto str(Tensor<T>& self) {
  return to_str(self);
}

template <typename T>
inline void fill(Tensor<T>& self, T fill) {
  self = make_tensor(self.shape, fill);
}

template <typename T>
inline auto get(Tensor<T>& self, uint32_t x, uint32_t y, uint32_t z) {
  return self.get(x, y, z);
}

template <typename T>
inline void assign(Tensor<T>& self, py::array_t<int> pos, py::array_t<T> val) {
  CHECK_ARGUMENT(pos.ndim() == 2);
  CHECK_ARGUMENT(val.ndim() == 1);

  auto n = pos.shape(0);
  auto k = pos.shape(1);
  CHECK_ARGUMENT(k == 3);
  CHECK_ARGUMENT(val.shape(0) == n);

  auto pos_acc = pos.template unchecked<2>();
  auto val_acc = val.template unchecked<1>();
  SparseTensorBuilder<std::optional<T>> builder(self.shape);

  for (auto i = 0; i < n; i += 1) {
    auto pos = vec3(pos_acc(i, 0), pos_acc(i, 1), pos_acc(i, 2));
    builder.set(to<unsigned int>(pos), val_acc(i));
  }
  self = tensors::merge(self, std::move(builder).build(), [](auto a, auto b) {
    return b.value_or(a);
  });
}

template <typename T>
inline auto dumps(Tensor<T>& self) {
  return transport::to_base64(transport::to_compressed_blob(self));
}

template <typename T>
inline void loads(Tensor<T>& self, const std::string& blob) {
  transport::from_compressed_blob(self, transport::from_base64(blob));
}

template <typename T>
inline auto dump(Tensor<T>& self) {
  return py::bytes(transport::to_blob(self));
}

template <typename T>
inline void load(Tensor<T>& self, const std::string& blob) {
  transport::from_blob(self, blob);
}

template <typename T>
inline auto array(tensors::Tensor<T>& tensor) {
  auto [w, h, d] = tensor.shape;
  auto ret = py::array_t<T>({d, h, w});
  auto acc = ret.template mutable_unchecked<3>();
  tensors::scan_dense(tensor, [&acc](auto pos, auto val) {
    acc(pos.z, pos.y, pos.x) = val;
  });
  return ret;
}

template <typename T>
inline auto fromarray(py::array_t<T> array) {
  CHECK_ARGUMENT(array.ndim() == 3);
  auto d = static_cast<unsigned int>(array.shape(0));
  auto h = static_cast<unsigned int>(array.shape(1));
  auto w = static_cast<unsigned int>(array.shape(2));
  auto shape = vec3(w, h, d);

  tensors::SparseTensorBuilder<T> builder(shape);
  auto acc = array.template unchecked<3>();
  for (auto z = 0u; z < shape.z; z += 1) {
    for (auto y = 0u; y < shape.y; y += 1) {
      for (auto x = 0u; x < shape.x; x += 1) {
        builder.set({x, y, z}, acc(z, y, x));
      }
    }
  }
  return std::move(builder).build();
}

template <typename T>
void bind_tensor(py::module m, const char* name) {
  py::class_<Tensor<T>>(m, name)
      .def(py::init(&ctor<T>), py::arg("shape"), py::arg("fill") = T())
      .def("__str__", &str<T>)
      .def("fill", &fill<T>)
      .def("get", &get<T>)
      .def("assign", &assign<T>)
      .def("dumps", &dumps<T>)
      .def("loads", &loads<T>)
      .def("dump", &dump<T>)
      .def("load", &load<T>)
      .def("array", &array<T>)
      .def_static("fromarray", &fromarray<T>);
}

void bind(py::module& m) {
  auto tm = m.def_submodule("tensors", "Compressed tensor data structure");

  bind_tensor<bool>(tm, "Tensor_Bool");
  bind_tensor<int8_t>(tm, "Tensor_I8");
  bind_tensor<int16_t>(tm, "Tensor_I16");
  bind_tensor<int32_t>(tm, "Tensor_I32");
  bind_tensor<int64_t>(tm, "Tensor_I64");
  bind_tensor<uint8_t>(tm, "Tensor_U8");
  bind_tensor<uint16_t>(tm, "Tensor_U16");
  bind_tensor<uint32_t>(tm, "Tensor_U32");
  bind_tensor<uint64_t>(tm, "Tensor_U64");
  bind_tensor<float>(tm, "Tensor_F32");
  bind_tensor<double>(tm, "Tensor_F64");
}

}  // namespace voxeloo::tensors::ext

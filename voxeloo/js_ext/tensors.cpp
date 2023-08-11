#include "voxeloo/js_ext/tensors.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/transport.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/tensors/hashing.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::tensors::js {

namespace {

template <typename T>
using BufferJs = buffers::js::BufferJs<T>;

template <typename T>
auto ctor(Vec3u shape, T fill) {
  return make_tensor(shape, fill);
}

template <typename T>
std::string dtype(ATTR_UNUSED const Tensor<T>& _) {
  return "";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<bool>& _) {
  return "Bool";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<int8_t>& _) {
  return "I8";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<int16_t>& _) {
  return "I16";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<int32_t>& _) {
  return "I32";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<uint8_t>& _) {
  return "U8";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<uint16_t>& _) {
  return "U16";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<uint32_t>& _) {
  return "U32";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<float>& _) {
  return "F32";
}

template <>
std::string dtype(ATTR_UNUSED const Tensor<double>& _) {
  return "F64";
}

template <typename T>
auto fill(Tensor<T>& tensor, T value) {
  tensor = make_tensor(tensor.shape, value);
}

template <typename T>
auto zero(Tensor<T>& tensor) {
  bool ret = true;
  tensors::scan_values(tensor, [&](auto val) {
    ret &= !val;
  });
  return ret;
}

template <typename T>
auto contains(const Tensor<T>& tensor, uint32_t x, uint32_t y, uint32_t z) {
  return max(tensor.shape, vec3(x, y, z) + 1u) == tensor.shape;
}

template <typename T>
auto get(const Tensor<T>& tensor, uint32_t x, uint32_t y, uint32_t z) {
  CHECK_ARGUMENT(contains(tensor, x, y, z));
  return tensor.get(x, y, z);
}

template <typename T>
void assign(
    Tensor<T>& self, const BufferJs<Vec3u>& pos, const BufferJs<T>& val) {
  CHECK_ARGUMENT(pos.size() == val.size());
  SparseTensorBuilder<std::optional<T>> builder(self.shape);
  for (auto i = 0u; i < pos.size(); i += 1) {
    builder.set(pos.impl[i], val.impl[i]);
  }
  self = tensors::merge(self, std::move(builder).build(), [](auto a, auto b) {
    return b.value_or(a);
  });
}

template <typename T>
void to_dense(Tensor<T>& self, BufferJs<T>& out) {
  out.resize(tensors::shape_len(self.shape));
  tensors::scan_dense(self, [&](auto pos, auto val) {
    out.impl[pos.x + (pos.y + pos.z * self.shape.z) * self.shape.y] = val;
  });
}

template <typename T>
void to_sparse(Tensor<T>& self, BufferJs<Vec3u>& pos, BufferJs<T>& val) {
  tensors::BufferBuilder<Vec3u> pos_builder;
  tensors::BufferBuilder<T> val_builder;
  tensors::scan_sparse(self, [&](auto pos, auto val) {
    pos_builder.add(pos);
    val_builder.add(val);
  });
  pos.impl = std::move(pos_builder).build();
  val.impl = std::move(val_builder).build();
}

template <typename T>
void find(
    Tensor<T>& self, const T& tgt, BufferJs<Vec3u>& pos, BufferJs<T>& val) {
  tensors::BufferBuilder<Vec3u> pos_builder;
  tensors::BufferBuilder<T> val_builder;
  tensors::find(
      self,
      [&](auto src) {
        return src == tgt;
      },
      [&](auto pos, auto val) {
        pos_builder.add(pos);
        val_builder.add(val);
      });
  pos.impl = std::move(pos_builder).build();
  val.impl = std::move(val_builder).build();
}

template <typename T>
auto chunk(const Tensor<T>& tensor, uint32_t x, uint32_t y, uint32_t z) {
  CHECK_ARGUMENT(contains(tensor, x, y, z));
  return make_tensor(*tensor.chunk({x, y, z}));
}

template <typename T>
void save(const Tensor<T>& tensor, BufferJs<uint8_t>& buffer) {
  auto blob = transport::to_blob(tensor);
  buffer.resize(blob.size());
  std::copy(blob.begin(), blob.end(), buffer.data());
}

template <typename T>
void load(Tensor<T>& tensor, const BufferJs<uint8_t>& buffer) {
  transport::from_blob(tensor, buffer.data(), buffer.size());
}

template <typename T>
auto storage_size(const Tensor<T>& tensor) {
  return tensors::storage_size(tensor);
}

template <typename T>
void bind_tensor(const char* name) {
  emscripten::class_<Tensor<T>>(name)
      .constructor(&ctor<T>)
      .property("shape", &Tensor<T>::shape)
      .function("dtype", &dtype<T>)
      .function("contains", &contains<T>)
      .function("get", &get<T>)
      .function("fill", &fill<T>)
      .function("assign", &assign<T>)
      .function("chunk", &chunk<T>)
      .function("zero", &zero<T>)
      .function("toDense", &to_dense<T>)
      .function("toSparse", &to_sparse<T>)
      .function("find", &find<T>)
      .function("save", &save<T>)
      .function("load", &load<T>)
      .function("storageSize", &storage_size<T>)
      .function("boundaryHash", &make_tensor_boundary_hashes<T>);
}

void bind_tensor_boundary_hashes() {
  emscripten::value_object<TensorBoundaryHashes>("TensorBoundaryHashes")
      .field("volumeHash", &TensorBoundaryHashes::volume_hash)
      .field("faceHashes", &TensorBoundaryHashes::face_hashes);

  // Needed because it's the type that `faceHashes` returns, but it's not
  // intended to be part of the interface on its own.
  voxeloo::js::bind_array<TensorFaceHashes, 6>("TensorFaceHashes");
}

}  // namespace

void bind() {
  bind_tensor<bool>("Tensor_Bool");
  bind_tensor<int8_t>("Tensor_I8");
  bind_tensor<int16_t>("Tensor_I16");
  bind_tensor<int32_t>("Tensor_I32");
  bind_tensor<uint8_t>("Tensor_U8");
  bind_tensor<uint16_t>("Tensor_U16");
  bind_tensor<uint32_t>("Tensor_U32");
  bind_tensor<float>("Tensor_F32");
  bind_tensor<double>("Tensor_F64");

  bind_tensor_boundary_hashes();
}

}  // namespace voxeloo::tensors::js

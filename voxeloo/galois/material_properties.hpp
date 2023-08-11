#pragma once

#include <optional>
#include <span>
#include <vector>

#include "voxeloo/galois/muck.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::galois::material_properties {

struct Buffer {
  sbo::StorageBuffer rank;
  sbo::StorageBuffer data;
};

template <typename T>
inline Buffer to_buffer(const tensors::Tensor<std::optional<T>>& tensor) {
  std::vector<T> samples;
  tensors::BufferBuilder<tensors::DictKey> builder;
  tensors::scan_sparse(tensor, [&](auto pos, auto sample) {
    samples.push_back(sample.value());
    builder.add(tensors::encode_tensor_pos(pos));
  });
  return Buffer{
      sbo::to_sbo(tensors::make_dict(std::move(builder).build()).to_buffer()),
      sbo::to_sbo(std::as_bytes(std::span{samples})),
  };
}

}  // namespace voxeloo::galois::material_properties

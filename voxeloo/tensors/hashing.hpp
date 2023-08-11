#pragma once

#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::tensors {

struct TensorFaceHashes {
  std::array<uint32_t, 6> hashes = {0};

  auto& operator[](size_t index) {
    return hashes[index];
  }
  const auto& operator[](size_t index) const {
    return hashes[index];
  }
};

struct TensorBoundaryHashes {
  uint32_t volume_hash = 0;
  TensorFaceHashes face_hashes = {0};
};

template <typename T>
TensorBoundaryHashes make_tensor_boundary_hashes(const Tensor<T>& tensor) {
  TensorBoundaryHashes result;

  constexpr auto add_hash = [](uint32_t& hash, uint32_t next, uint32_t len) {
    hash = random_hash(random_hash(hash + next) + len);
  };

  scan_runs(tensor, [&](auto pos, auto len, auto val) {
    add_hash(result.volume_hash, val, len);
    if (pos.x == 0) {
      add_hash(result.face_hashes[voxels::X_NEG], val, 1);
    }
    if (pos.y == 0) {
      add_hash(result.face_hashes[voxels::Y_NEG], val, len);
    }
    if (pos.z == 0) {
      add_hash(result.face_hashes[voxels::Z_NEG], val, len);
    }
    if (pos.x + len == tensor.shape.x) {
      add_hash(result.face_hashes[voxels::X_POS], val, 1);
    }
    if (pos.y == tensor.shape.y - 1) {
      add_hash(result.face_hashes[voxels::Y_POS], val, len);
    }
    if (pos.z == tensor.shape.z - 1) {
      add_hash(result.face_hashes[voxels::Z_POS], val, len);
    }
  });

  return result;
}

}  // namespace voxeloo::tensors

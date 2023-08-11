#pragma once

#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/arrays.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::tensors {

template <typename T>
class SparseArrayBuilder {
 public:
  explicit SparseArrayBuilder(size_t size, size_t non_zeros = 0)
      : size_(size), builder_(1 + 2 * non_zeros) {}

  void add(ArrayRun run, T val) {
    // TODO(matthew): Make this class sort the runs.
    CHECK_ARGUMENT(run.pos >= builder_.back());
    if (builder_.back() < run.pos) {
      builder_.add(run.pos - builder_.back(), T());
    }
    builder_.add(run.len, val);
  }

  void add(ArrayPos pos, T val) {
    add({pos, 1}, val);
  }

  auto build() && {
    if (builder_.back() < size_) {
      builder_.add(size_ - builder_.back(), T());
    }
    return std::move(builder_).build();
  }

 private:
  size_t size_;
  ArrayBuilder<T> builder_;
};

template <typename T>
class SparseChunkBuilder {
 public:
  SparseChunkBuilder() = default;
  explicit SparseChunkBuilder(size_t non_zeros) {
    vals_.reserve(non_zeros);
  }

  void set(TensorPos pos, T val) {
    vals_.push_back({encode_tensor_pos(pos), val});
  }

  auto build() && {
    std::stable_sort(vals_.begin(), vals_.end(), [](auto& l, auto& r) {
      return std::get<0>(l) < std::get<0>(r);
    });

    SparseArrayBuilder<T> builder(kChunkSize, vals_.size());
    for (auto i = 0u; i < vals_.size(); i += 1) {
      auto [pos, val] = vals_[i];
      if (i == vals_.size() - 1 || pos != std::get<0>(vals_[i + 1])) {
        builder.add(pos, val);
      }
    }
    return Chunk<T>(std::move(builder).build());
  }

 private:
  std::vector<std::tuple<ArrayPos, T>> vals_;
};

template <typename T>
class SparseTensorBuilder {
 public:
  explicit SparseTensorBuilder(Vec3u shape) : tensor_(make_tensor<T>(shape)) {}

  void set(TensorPos pos, T val) {
    auto& builder = builders_[tensor_.chunk_index(pos)];
    builder.set(tensors::chunk_mod(pos), std::move(val));
  }

  auto build() && {
    Tensor<T> ret(std::move(tensor_));
    for (auto&& [i, builder] : std::move(builders_)) {
      *ret.chunks[i] = std::move(builder).build();
    }
    return ret;
  }

 private:
  Tensor<T> tensor_;
  std::unordered_map<size_t, SparseChunkBuilder<T>> builders_;
};

}  // namespace voxeloo::tensors
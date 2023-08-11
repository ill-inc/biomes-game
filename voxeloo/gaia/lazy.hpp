#pragma once

#include <optional>
#include <utility>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::gaia {

template <typename T>
class Lazy {
 public:
  explicit operator bool() const {
    return data_;
  }

  bool initialized() const {
    return data_;
  }

  auto& get() {
    CHECK_STATE(data_);
    return data_.value();
  }
  const auto& get() const {
    CHECK_STATE(data_);
    return data_.value();
  }

  auto& operator->() {
    return get();
  }
  const auto& operator->() const {
    return get();
  }

  void set(T data) {
    CHECK_STATE(!data_);
    data_.emplace(std::move(data));
  }

 private:
  std::optional<T> data_;
};

}  // namespace voxeloo::gaia
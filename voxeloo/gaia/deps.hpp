#pragma once

#include <memory>

#include "voxeloo/gaia/lazy.hpp"

namespace voxeloo::gaia {

template <typename T>
using Dep = std::shared_ptr<T>;

template <typename T, typename... Args>
inline auto make_dep(Args&&... args) {
  return std::make_shared<T>(std::forward<Args>(args)...);
}

}  // namespace voxeloo::gaia
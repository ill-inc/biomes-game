#pragma once

#include <chrono>

#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

using Clock = std::chrono::high_resolution_clock;

template <typename Fn>
class Timer {
 public:
  explicit Timer(Fn&& fn) : fn_(fn) {
    start_ = Clock::now();
  }

  ~Timer() {
    std::chrono::duration<double, std::milli> duration = Clock::now() - start_;
    fn_(duration.count());
  }

 private:
  std::chrono::time_point<Clock> start_;
  Fn fn_;
};

}  // namespace voxeloo::gaia
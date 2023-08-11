#pragma once

#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/voxels.hpp"

namespace voxeloo::boxifier {

using Box = voxels::Box;

struct Run {
  Vec3i start;
  int length;
};

// Merges a collection of disjoint and ordered runs into a collection of AABBs.
// TODO(taylor): Consider making the implementation slightly more efficiently by
// eagerly merging runs along the y-dimension instead of buffering them.
class Boxifier {
 public:
  void push(Run run);

  template <typename EmitFn>
  void emit(EmitFn&& fn) {
    merge();
    merge();
    for (auto& box : out_) {
      fn(std::move(box));
    }
    out_.clear();
  }

  std::vector<Box> build();

 private:
  void merge();

  std::vector<Run> runs_;
  std::vector<Box> prev_;
  std::vector<Box> out_;
};

}  // namespace voxeloo::boxifier

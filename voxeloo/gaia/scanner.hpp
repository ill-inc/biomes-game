#pragma once

#include "voxeloo/common/hashing.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/sparse.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::gaia {

class Scanner {
  explicit Scanner(size_t n) : n_(n), i_(0) {}

  auto next() {
    if (i_ >= n_) {
      i_ = 0;
    }
    return i_++;
  }

 private:
  size_t n_;
  size_t i_;
};

class Scanner2 {
 public:
  explicit Scanner2(Vec2u shape) : shape_(shape), pos_{0, 0} {}

  auto next() {
    auto ret = pos_;
    pos_.x += 1;
    if (pos_.x >= shape_.x) {
      pos_.x = 0;
      pos_.y += 1;
      if (pos_.y >= shape_.y) {
        pos_.y = 0;
      }
    }
    return ret;
  }

 private:
  Vec2u shape_;
  Vec2u pos_;
};

class Scanner3 {
 public:
  explicit Scanner3(Vec3u shape) : shape_(shape), pos_{0, 0, 0} {}

  auto next() {
    auto ret = pos_;
    pos_.x += 1;
    if (pos_.x >= shape_.x) {
      pos_.x = 0;
      pos_.y += 1;
      if (pos_.y >= shape_.y) {
        pos_.y = 0;
        pos_.z += 1;
        if (pos_.z >= shape_.z) {
          pos_.z = 0;
        }
      }
    }
    return ret;
  }

 private:
  Vec3u shape_;
  Vec3u pos_;
};

inline auto one_in(size_t k) {
  static size_t i = 0;
  return k > 0 && i++ % k == 0;
}

}  // namespace voxeloo::gaia
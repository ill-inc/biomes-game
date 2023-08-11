#pragma once

#include <algorithm>
#include <cstdint>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/hull.hpp"
#include "voxeloo/tensors/tensors.hpp"

namespace voxeloo::culling {

struct AABB {
  Vec3d v0;
  Vec3d v1;
};

class OcclusionBuffer {
 public:
  explicit OcclusionBuffer(const Vec2u& shape)
      : shape_(shape), data_(shape.x * shape.y) {}

  const auto& shape() const {
    return shape_;
  }

  void set(const Vec2u& pos) {
    data_[index(pos)] = true;
  }

  void del(const Vec2u& pos) {
    data_[index(pos)] = false;
  }

  void swap(const Vec2u& pos) {
    data_[index(pos)] = !data_[index(pos)];
  }

  bool get(const Vec2u& pos) const {
    return static_cast<bool>(data_[index(pos)]);
  }

  auto begin() const {
    return data_.begin();
  }

  auto end() const {
    return data_.end();
  }

 private:
  size_t index(const Vec2u& pos) const {
    return pos.x + shape_.x * pos.y;
  }

  Vec2u shape_;
  std::vector<bool> data_;
};

class OcclusionCuller {
 public:
  OcclusionCuller(Mat4x4d proj, Vec2u shape) : proj_(proj), buffer_(shape) {}

  auto shape() const {
    return buffer_.shape();
  }

  // Writes the given occluder to the occlusion mask.
  void write(const AABB& aabb);

  // Returns true if the given AABB is not culled by the occlusion mask.
  bool test(const AABB& aabb) const;

  const auto& buffer() const {
    return buffer_;
  }

 private:
  Mat4x4d proj_;
  OcclusionBuffer buffer_;
};

using Occluder = std::vector<AABB>;

void rasterize_aabb_inclusive(
    OcclusionBuffer& buffer, const Mat4x4d& proj, const AABB& aabb);
void rasterize_aabb_exclusive(
    OcclusionBuffer& buffer, const Mat4x4d& proj, const AABB& aabb);

void rasterize_many_aabb_inclusive(
    OcclusionBuffer& buffer,
    const Mat4x4d& proj,
    const std::vector<AABB>& aabbs);
void rasterize_many_aabb_exclusive(
    OcclusionBuffer& buffer,
    const Mat4x4d& proj,
    const std::vector<AABB>& aabbs);

Occluder to_occluder(const tensors::Tensor<bool>& tensor, Vec3d origin);

}  // namespace voxeloo::culling

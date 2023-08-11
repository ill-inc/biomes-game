#pragma once

#include <array>
#include <vector>

#include "voxeloo/common/bits.hpp"
#include "voxeloo/common/boxifier.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/subbox.hpp"
#include "voxeloo/common/voxels.hpp"
#include "voxeloo/galois/sbo.hpp"
#include "voxeloo/tensors/routines.hpp"
#include "voxeloo/tensors/tensors.hpp"
#include "voxeloo/tensors/utils.hpp"

namespace voxeloo::galois::collision {

struct AABB {
  Vec3d v0;
  Vec3d v1;
};

inline auto volume(const AABB& aabb) {
  auto size = max(aabb.v1 - aabb.v0, 0.0);
  return size.x * size.y * size.z;
}

using BoxList = std::vector<AABB>;

template <typename T>
inline auto to_box_list(const tensors::Tensor<T>& tensor, Vec3d origin) {
  BoxList out;
  tensors::scan_chunks(tensor, [&](auto i, auto chunk_pos, const auto& chunk) {
    boxifier::Boxifier boxifier;

    // Convert everything to a boolean. The reason we have to do this is because
    // the boxifier expects all consecutive-along-x runs to be non-compressible.
    auto mask = tensors::map_values(chunk.array, [](auto val) {
      return static_cast<bool>(val);
    });

    // Populate the boxifier with each run of colliding voxels.
    tensors::scan(mask, [&](auto run, auto val) {
      if (val) {
        partition_run(run, [&](auto pos, auto len) {
          boxifier.push({to<int>(pos).xzy(), static_cast<int>(len)});
        });
      }
    });

    // Emit the compressed boxes.
    // NOTE: We need to do handle the y-last scan order of tensors here.
    boxifier.emit([&](voxels::Box box) {
      auto [v0, v1] = box;
      out.push_back({
          origin + to<double>(v0.xzy() + to<int>(chunk_pos)),
          origin + to<double>(v1.xzy() + to<int>(chunk_pos)),
      });
    });
  });
  return out;
}

// TODO(taylor): Add a level of indirection to handle large numbers of boxes.
class BoxDict {
 public:
  explicit BoxDict(BoxList boxes) : boxes_(std::move(boxes)) {}

  auto size() const {
    return boxes_.size();
  }

  template <typename Fn>
  void scan(Fn&& fn) const {
    for (const auto& box : boxes_) {
      fn(box);
    }
  }

  template <typename Fn>
  void intersect(const AABB& aabb, Fn&& fn) const {
    for (const auto& b : boxes_) {
      auto v0 = max(b.v0, aabb.v0);
      auto v1 = min(b.v1, aabb.v1);
      if (v0.x < v1.x && v0.y < v1.y && v0.z < v1.z) {
        if constexpr (std::is_same_v<decltype(fn(b)), bool>) {
          if (fn(b)) {
            return;
          }
        } else {
          fn(b);
        }
      }
    }
  };

  bool intersects(const AABB& aabb) const {
    bool ret = false;
    intersect(aabb, [&](ATTR_UNUSED const auto& _) {
      ret = true;
      return true;
    });
    return ret;
  }

 private:
  BoxList boxes_;
};

inline auto to_box_dict(const BoxList& boxes) {
  return BoxDict(boxes);
}

template <typename T>
inline auto to_box_dict(const tensors::Tensor<T>& tensor, Vec3d origin) {
  return to_box_dict(to_box_list(tensor, origin));
}

}  // namespace voxeloo::galois::collision

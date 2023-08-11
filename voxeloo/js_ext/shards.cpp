#include "voxeloo/js_ext/shards.hpp"

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cmath>
#include <cstdint>
#include <string>

#include "voxeloo/biomes/culling.hpp"
#include "voxeloo/biomes/shards.hpp"
#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/common.hpp"
#include "voxeloo/js_ext/galois.hpp"

namespace voxeloo::shards::js {

namespace {

namespace em = emscripten;
namespace js = voxeloo::js;

template <typename T>
using BufferJs = buffers::js::BufferJs<T>;

class FrustumSharderJs {
 public:
  explicit FrustumSharderJs(uint32_t level) : impl_(level) {}

  auto populate(
      BufferJs<Vec3i>& buffer,
      Vec3d origin,
      Vec3d view,
      const Mat4x4d& view_proj) {
    auto shards = impl_.get_positions(origin, view, view_proj);
    buffer.resize(shards.size());
    std::copy(shards.begin(), shards.end(), buffer.data());
  }

 private:
  shards::FrustumSharder impl_;
};

class VisibilitySharder {
 public:
  VisibilitySharder(Mat4x4d proj, Vec3d origin, Vec3d view, Vec2u resolution)
      : proj_(proj), origin_(origin), view_(view), culler_(proj, resolution) {}

  void write_occlusion(BufferJs<uint8_t>& buffer) const {
    const auto [w, h] = culler_.buffer().shape();
    buffer.impl.resize(w * h);
    auto i = 0u;
    for (auto occluded : culler_.buffer()) {
      buffer.impl[i++] = static_cast<uint8_t>(occluded ? 255 : 0);
    }
  }

  void scan(em::val callback) {
    // Identify the shards that are within the frustum
    shards::FrustumSharder sharder(kBlockLvl);
    auto coords = sharder.get_positions(origin_, view_, proj_);

    // Emit the IDs of shards that are within the frustum and not occluded.
    for (auto pos : coords) {
      culling::AABB aabb{
          to<double>(shards::shard_mul(shards::kBlockLvl, pos)),
          to<double>(shards::shard_mul(shards::kBlockLvl, pos + 1)),
      };
      if (culler_.test(aabb)) {
        auto val = callback(shard_encode_js(pos));
        if (!val.isUndefined()) {
          const auto& batch = *js::as_ptr<culling::Occluder>(val);
          for (const auto& aabb : batch) {
            culler_.write(aabb);
          }
        }
      }
    }
  }

 private:
  Mat4x4d proj_;
  Vec3d origin_;
  Vec3d view_;
  culling::OcclusionCuller culler_;
};

}  // namespace

void bind() {
  // Bind shard position types and routines.
  em::value_object<ShardPos>("ShardPos")
      .field("level", &ShardPos::level)
      .field("pos", &ShardPos::pos);
  em::function("shardEncode", &shard_encode_js);
  em::function("shardDecode", &shard_decode_js);

  // Frustum intersection testing.
  em::class_<FrustumSharderJs>("FrustumSharder")
      .constructor<uint32_t>()
      .function("populate", &FrustumSharderJs::populate);

  // Provides routines for finding visible shards with occlusion culling.
  em::class_<VisibilitySharder>("VisibilitySharder")
      .constructor<Mat4x4d, Vec3d, Vec3d, Vec2u>()
      .function("scan", &VisibilitySharder::scan)
      .function("writeOcclusionBuffer", &VisibilitySharder::write_occlusion);
}

}  // namespace voxeloo::shards::js

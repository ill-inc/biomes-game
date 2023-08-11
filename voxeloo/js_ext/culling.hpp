#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "voxeloo/biomes/culling.hpp"
#include "voxeloo/js_ext/buffers.hpp"
#include "voxeloo/js_ext/shards.hpp"

namespace voxeloo::culling::js {

namespace em = emscripten;

template <typename Val>
using BufferJs = buffers::js::BufferJs<Val>;

void write_buffer(const OcclusionCuller& culler, BufferJs<uint8_t>& buffer) {
  const auto [w, h] = culler.buffer().shape();
  buffer.impl.resize(w * h);
  auto i = 0u;
  for (auto occluded : culler.buffer()) {
    buffer.impl[i++] = static_cast<uint8_t>(occluded ? 255 : 0);
  }
}

auto inline empty(const Occluder& occluder) {
  return occluder.empty();
}

auto inline size(const Occluder& occluder) {
  return occluder.size();
}

auto inline scan(const Occluder& occluder, em::val cb) {
  for (const auto& aabb : occluder) {
    cb(aabb);
  }
}

inline void bind() {
  em::value_array<culling::AABB>("AABB")
      .element(&culling::AABB::v0)
      .element(&culling::AABB::v1);

  em::class_<Occluder>("Occluder")
      .function("empty", &empty)
      .function("size", &size)
      .function("scan", &scan);

  em::class_<OcclusionCuller>("OcclusionCuller")
      .constructor<Mat4x4d, Vec2u>()
      .function("shape", &OcclusionCuller::shape)
      .function("write", &OcclusionCuller::write)
      .function("test", &OcclusionCuller::test);

  em::function("writeOcclusionBuffer", write_buffer);
}

}  // namespace voxeloo::culling::js

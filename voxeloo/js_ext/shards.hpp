#pragma once

#include "voxeloo/biomes/shards.hpp"

namespace voxeloo::shards::js {

inline auto shard_encode_js(Vec3i pos) {
  return shards::shard_encode<std::wstring>({shards::kBlockLvl, pos});
}

inline auto shard_decode_js(const std::wstring& code) {
  return shards::shard_decode(code).pos;
}

void bind();

}  // namespace voxeloo::shards::js

#pragma once

#include <array>
#include <span>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::galois::sbo {

static constexpr uint32_t kBufferWidth = 2048u;

struct StorageBuffer {
  Vec2u shape;
  std::vector<uint32_t> data;

  explicit StorageBuffer(Vec2u shape) : shape(shape), data(shape.x * shape.y) {}

  auto bytes() const {
    return sizeof(data[0]) * data.size();
  }

  auto view() const {
    return reinterpret_cast<const uint8_t*>(&data[0]);
  }
};

inline auto to_sbo(const uint32_t* data, uint32_t size) {
  if (size == 0) {
    return StorageBuffer{{0, 0}};
  } else {
    auto w = std::min(kBufferWidth, size);
    auto h = ((size - 1) / w) + 1;
    StorageBuffer ret({h, w});
    std::copy(data, data + size, &ret.data[0]);
    return ret;
  }
}

inline auto to_sbo(const std::vector<uint32_t>& data) {
  return to_sbo(&data[0], data.size());
}

inline auto to_sbo(tensors::Buffer<uint32_t> data) {
  return to_sbo(&data[0], data.size());
}

inline auto to_sbo(std::span<const std::byte> data) {
  CHECK_ARGUMENT(data.size_bytes() % sizeof(uint32_t) == 0);
  return to_sbo(
      reinterpret_cast<const uint32_t*>(data.data()),
      data.size_bytes() / sizeof(uint32_t));
}

}  // namespace voxeloo::galois::sbo

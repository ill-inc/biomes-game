#pragma once

#include <memory>
#include <vector>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/geometry.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/tensors/arrays.hpp"

namespace voxeloo::tensors {

using uint = unsigned int;
using TensorPos = Vec3u;

static constexpr uint32_t kChunkDim = 32;
static constexpr uint32_t kChunkSize = 32 * 32 * 32;
static const Vec3u kChunkShape = {kChunkDim, kChunkDim, kChunkDim};

inline auto encode_tensor_pos(TensorPos pos) {
  auto k_0 = static_cast<ArrayPos>((pos.y & 0x1f) << 10);
  auto k_1 = static_cast<ArrayPos>((pos.z & 0x1f) << 5);
  auto k_2 = static_cast<ArrayPos>((pos.x & 0x1f));
  return static_cast<ArrayPos>(k_0 | k_1 | k_2);
}

inline auto decode_tensor_pos(ArrayPos pos) {
  auto y = static_cast<unsigned int>((pos >> 10) & 0x1f);
  auto z = static_cast<unsigned int>((pos >> 5) & 0x1f);
  auto x = static_cast<unsigned int>(pos & 0x1f);
  return vec3(x, y, z);
}

inline auto encode_tensor_pos32(TensorPos pos) {
  auto k_0 = (pos.y & 0x3ff) << 20;
  auto k_1 = (pos.z & 0x3ff) << 10;
  auto k_2 = pos.x & 0x3ff;
  return k_0 | k_1 | k_2;
}

inline auto decode_tensor_pos32(uint32_t pos) {
  auto y = (pos >> 20) & 0x3ff;
  auto z = (pos >> 10) & 0x3ff;
  auto x = pos & 0x3ff;
  return vec3(x, y, z);
}

// A RLE-compressed implementation of fixed-size 3D tensor.
template <typename T>
struct Chunk {
  Array<T> array;

  Chunk() : array(make_array<T>(kChunkSize)) {}

  explicit Chunk(Array<T> array) : array(std::move(array)) {
    CHECK_ARGUMENT(array.size() == kChunkSize);
  }

  auto get(Vec3u pos) const {
    return array.get(encode_tensor_pos(pos));
  }
  auto get(uint x, uint y, uint z) const {
    return get({x, y, z});
  }
};

template <typename T>
using ChunkPtr = std::shared_ptr<Chunk<T>>;

template <typename T>
inline auto make_chunk(T fill = T()) {
  return Chunk<T>(make_array<T>(kChunkSize, fill));
}

template <typename T>
inline auto make_chunk(Chunk<T> chunk) {
  return Chunk<T>(make_array<T>(std::move(chunk->array)));
}

template <typename T>
inline auto make_chunk_ptr(T fill = T()) {
  return std::make_shared<Chunk<T>>(make_array(kChunkSize, fill));
}

template <typename T>
inline auto make_chunk_ptr(Chunk<T> chunk) {
  return std::make_shared<Chunk<T>>(std::move(chunk.array));
}

template <typename T>
inline auto storage_size(const Chunk<T>& chunk) {
  return storage_size(chunk.array);
}

template <typename Archive, typename T>
inline void save(Archive& ar, const Chunk<T>& chunk) {
  ar(chunk.array);
}

template <typename Archive, typename T>
inline void load(Archive& ar, Chunk<T>& chunk) {
  ar(chunk.array);
}

inline auto chunk_mul(Vec3u pos) {
  return pos * kChunkDim;
}

inline auto chunk_div(Vec3u pos) {
  return pos / kChunkDim;
}

inline auto chunk_mod(Vec3u pos) {
  return pos % kChunkDim;
}

inline auto shape_len(Vec3u shape) {
  return shape.x * shape.y * shape.z;
}

inline auto is_chunk_pos(Vec3u pos) {
  return tensors::chunk_div(pos) == vec3(0u, 0u, 0u);
}

template <typename T>
struct Tensor {
  Vec3u shape;
  Buffer<ChunkPtr<T>> chunks;

  Tensor() : shape{0u, 0u, 0u} {}

  Tensor(const Vec3u& shape, Buffer<ChunkPtr<T>> chunks)
      : shape(shape), chunks(std::move(chunks)) {
    CHECK_ARGUMENT(shape_len(chunk_div(shape)) == chunks.size());
  }

  auto chunk_index(Vec3u pos) const {
    auto [x, y, z] = chunk_div(pos);
    auto [w, h, d] = chunk_div(shape);
    return x + w * (y + h * z);
  }

  const auto& chunk(Vec3u pos) const {
    return chunks[chunk_index(pos)];
  }

  auto& chunk(Vec3u pos) {
    return chunks[chunk_index(pos)];
  }

  auto get(Vec3u pos) const {
    return chunk(pos)->get(pos % kChunkDim);
  }
  auto get(uint x, uint y, uint z) const {
    return get({x, y, z});
  }
};

template <typename T>
inline auto make_tensor(Vec3u shape, T fill = T()) {
  shape = chunk_mul(
      chunk_div(shape) +
      chunk_mod(shape).template to<bool>().template to<uint32_t>());
  CHECK_ARGUMENT(chunk_mod(shape) == vec3(0u, 0u, 0u));
  auto [w, h, d] = chunk_div(shape);
  BufferBuilder<ChunkPtr<T>> builder(w * h * d);
  for (auto z = 0u; z < d; z += 1) {
    for (auto y = 0u; y < h; y += 1) {
      for (auto x = 0u; x < w; x += 1) {
        builder.add(make_chunk_ptr<T>(fill));
      }
    }
  }
  return Tensor<T>{shape, std::move(builder).build()};
}

template <typename T>
inline auto make_tensor(Chunk<T> chunk) {
  return Tensor<T>{kChunkShape, buffer_of({make_chunk_ptr(std::move(chunk))})};
}

template <typename T, typename Fn>
inline auto scan_chunks(const Tensor<T>& tensor, Fn&& fn) {
  auto i = 0u;
  for (auto z = 0u; z < tensor.shape.z; z += kChunkDim) {
    for (auto y = 0u; y < tensor.shape.y; y += kChunkDim) {
      for (auto x = 0u; x < tensor.shape.x; x += kChunkDim) {
        fn(i, vec3(x, y, z), *tensor.chunks[i]);
        i += 1;
      }
    }
  }
}

template <typename T, typename Fn>
inline auto map_chunks(const Tensor<T>& tensor, Fn&& fn) {
  using Ret = decltype(fn(0u, Vec3u(), *tensor.chunks[0]).get(Vec3u()));

  auto i = 0u;
  auto [w, h, d] = chunk_div(tensor.shape);
  BufferBuilder<ChunkPtr<Ret>> builder(w * h * d);
  for (auto z = 0u; z < tensor.shape.z; z += kChunkDim) {
    for (auto y = 0u; y < tensor.shape.y; y += kChunkDim) {
      for (auto x = 0u; x < tensor.shape.x; x += kChunkDim) {
        builder.add(make_chunk_ptr(fn(i, vec3(x, y, z), *tensor.chunks[i])));
        ++i;
      }
    }
  }
  return Tensor<Ret>{tensor.shape, std::move(builder).build()};
}

// TODO(taylor): Add tensor scanner and iterator classes.

template <typename T>
inline auto storage_size(const Tensor<T>& tensor) {
  auto ret = sizeof(tensor);
  scan_chunks(tensor, [&](auto i, auto pos, const auto& chunk) {
    ret += storage_size(chunk);
  });
  return ret;
}

template <typename Archive, typename T>
inline void save(Archive& ar, const Tensor<T>& tensor) {
  ar(tensor.shape.x, tensor.shape.y, tensor.shape.z);
  for (const auto& chunk : tensor.chunks) {
    ar(*chunk);
  }
}

template <typename Archive, typename T>
inline void load(Archive& ar, Tensor<T>& tensor) {
  ar(tensor.shape.x, tensor.shape.y, tensor.shape.z);

  tensor.chunks.resize(shape_len(chunk_div(tensor.shape)));
  for (auto& chunk : tensor.chunks) {
    chunk = std::make_shared<Chunk<T>>();
    ar(*chunk);
  }
}

template <typename T>
inline auto to_str(const Tensor<T>& tensor) {
  std::stringstream ss;
  scan_chunks(tensor, [&](auto i, auto pos, const auto& chunk) {
    ss << "Chunk[" << i << "] at " << pos << ":\n";
    ss << to_str(chunk.array) << "\n";
  });
  return ss.str();
}

// TODO(taylor): Add scatter / gather / map / bimap routines.

}  // namespace voxeloo::tensors
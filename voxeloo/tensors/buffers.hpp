#pragma once

#include <algorithm>
#include <cstdint>
#include <memory>
#include <type_traits>

#include "voxeloo/common/errors.hpp"
#include "voxeloo/common/format.hpp"
#include "voxeloo/common/macros.hpp"
#include "voxeloo/common/transport.hpp"

namespace voxeloo::tensors {

// Buffers provide the basic primitive for storing contiguous binary data. The
// implementation offers convenient routines for copying and serialization.
template <typename T>
class Buffer {
 public:
  explicit Buffer(size_t size = 0u) : size_(0), data_(nullptr) {
    resize(size);
  }

  Buffer(const Buffer& other) {
    assign(other);
  }
  Buffer(Buffer&& other) {
    assign(std::move(other));
  }

  auto data() {
    return data_.get();
  }
  const auto data() const {
    return data_.get();
  }

  auto size() const {
    return size_;
  }

  bool empty() const {
    return size() == 0;
  }

  auto clone() const {
    Buffer<T> ret;
    ret.resize(size_);
    if (size_ > 0) {
      std::copy(&data_[0], &data_[size_], &ret.data_[0]);
    }
    return ret;
  }

  void realloc() {
    if (size_ > 0) {
      std::unique_ptr<T[]> swap(new T[size_]);
      std::copy(&data_[0], &data_[size_], &swap[0]);
      swap.swap(data_);
    }
  }

  void resize(size_t size) {
    if (size > size_) {
      std::unique_ptr<T[]> swap(new T[size]);
      if (size_ > 0) {
        std::copy(&data_[0], &data_[size_], &swap[0]);
      }
      swap.swap(data_);
    }
    size_ = size;
  }

  void assign(const Buffer<T>& buffer) {
    assign(buffer.clone());
  }
  void assign(Buffer<T>&& buffer) {
    size_ = buffer.size_;
    data_ = std::move(buffer.data_);
  }

  auto& operator=(const Buffer& other) {
    assign(other);
    return *this;
  }
  auto& operator=(Buffer&& other) {
    assign(std::move(other));
    return *this;
  }

  auto& operator[](size_t pos) {
    return data_[pos];
  }
  const auto& operator[](size_t pos) const {
    return data_[pos];
  }

  auto begin() {
    return &data_[0];
  }
  const auto begin() const {
    return &data_[0];
  }
  auto end() {
    return &data_[size_];
  }
  const auto end() const {
    return &data_[size_];
  }

 private:
  size_t size_;
  std::unique_ptr<T[]> data_;
};

template <typename T>
inline auto make_buffer(size_t size) {
  return Buffer<T>(size);
}

template <typename T>
inline auto make_buffer(size_t size, T fill) {
  auto ret = make_buffer<T>(size);
  std::fill(ret.data(), ret.data() + size, fill);
  return ret;
}

template <typename T>
inline auto buffer_of(std::initializer_list<T> il) {
  auto ret = make_buffer<T>(il.size());
  std::copy(il.begin(), il.end(), ret.data());
  return ret;
}

template <typename Iter>
inline auto buffer_from(Iter begin, Iter end) {
  using T = std::decay_t<decltype(*begin)>;
  auto ret = make_buffer<T>(std::distance(begin, end));
  std::copy(begin, end, ret.data());
  return ret;
}

template <typename T>
inline auto storage_size(const Buffer<T>& buffer) {
  return sizeof(Buffer<T>) + sizeof(T) * buffer.size();
}

template <typename T>
class BufferBuilder {
 public:
  explicit BufferBuilder(Buffer<T> buffer)
      : size_(0), buffer_(std::move(buffer)) {}
  explicit BufferBuilder(size_t size = 0) : BufferBuilder(Buffer<T>(size)) {}

  auto size() const {
    return size_;
  }

  auto& back() {
    return buffer_[size_ - 1];
  }
  const auto& back() const {
    return buffer_[size_ - 1];
  }

  void add(T value) {
    if (UNLIKELY(size_ == buffer_.size())) {
      buffer_.resize(std::max(size_ << 1, size_ + 1));
    }
    buffer_[size_++] = std::move(value);
  }

  auto build() && {
    Buffer<T> ret(std::move(buffer_));
    if (ret.size() != size_) {
      ret.resize(size_);
      ret.realloc();
    }
    return ret;
  }

 private:
  size_t size_;
  Buffer<T> buffer_;
};

template <typename S, typename... T>
class MultiBufferBuilder {
 public:
  explicit MultiBufferBuilder(size_t capacity)
      : size_(0),
        capacity_(capacity),
        buffers_(Buffer<S>(capacity), Buffer<T>(capacity)...) {}

  auto size() const {
    return size_;
  }

  template <size_t pos>
  auto& back() {
    return std::get<pos>(buffers_)[size_ - 1];
  }

  template <size_t pos>
  const auto& back() const {
    return std::get<pos>(buffers_)[size_ - 1];
  }

  void add(S head, T... tail) {
    if (UNLIKELY(size_ == capacity_)) {
      resize(std::max(size_ + 1, size_ << 1));
    }
    insert<0>(std::move(head), std::move(tail)...);
    size_ += 1;
  }

  auto build() && {
    resize(size_);
    return std::move(buffers_);
  }

 private:
  template <size_t pos, typename A, typename... B>
  void insert(A head, B... tail) {
    std::get<pos>(buffers_)[size_] = std::forward<A>(head);
    if constexpr (pos < sizeof...(T)) {
      insert<pos + 1>(std::forward<B>(tail)...);
    }
  }

  void resize(size_t capacity) {
    capacity_ = capacity;
    resize<0>();
  }

  template <size_t pos>
  void resize() {
    auto& buffer = std::get<pos>(buffers_);
    if (buffer.size() != capacity_) {
      buffer.resize(capacity_);
      buffer.realloc();
    }
    if constexpr (pos < sizeof...(T)) {
      resize<pos + 1>();
    }
  }

  size_t size_;
  size_t capacity_;
  std::tuple<Buffer<S>, Buffer<T>...> buffers_;
};

template <typename Archive, typename T>
inline void save(Archive& ar, const Buffer<T>& buffer) {
  CHECK_ARGUMENT(buffer.size() < std::numeric_limits<uint32_t>::max());
  ar(static_cast<uint32_t>(buffer.size()));
  ar(cereal::binary_data(buffer.data(), sizeof(T) * buffer.size()));
}

template <typename Archive, typename T>
inline void load(Archive& ar, Buffer<T>& buffer) {
  buffer.resize(transport::get<uint32_t>(ar));
  ar(cereal::binary_data(buffer.data(), sizeof(T) * buffer.size()));
}

}  // namespace voxeloo::tensors
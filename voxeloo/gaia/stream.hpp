#pragma once

#include "voxeloo/common/errors.hpp"
#include "voxeloo/gaia/queue.hpp"
#include "voxeloo/tensors/buffers.hpp"

namespace voxeloo::gaia {

template <typename T>
struct ClosableQueue {
  bool open = true;
  Queue<T> impl;
};

template <typename T>
class StreamReader;

template <typename T>
class Stream {
 public:
  void write(const T& data) {
    auto it = queues_.begin();
    while (it != queues_.end()) {
      const auto& queue = *it;
      if (queue->open && queue.use_count() > 1) {
        queue->impl.push(data);
        ++it;
      } else {
        it = queues_.erase(it);
      }
    }
  }

  auto subscribe() const {
    auto queue = std::make_shared<ClosableQueue<T>>();
    queues_.push_back(queue);
    return StreamReader<T>(queue);
  }

 private:
  mutable std::vector<std::shared_ptr<ClosableQueue<T>>> queues_;
};

template <typename T>
class StreamReader {
 public:
  explicit StreamReader(std::shared_ptr<ClosableQueue<T>> queue)
      : queue_(std::move(queue)) {}

  bool open() const {
    return queue_->open;
  }

  bool empty() const {
    return queue_->impl.empty();
  }

  auto read() {
    auto& queue = queue_->impl;
    tensors::BufferBuilder<T> builder(queue.size());
    while (queue.size()) {
      builder.add(queue.pop());
    }
    return std::move(builder).build();
  }

  void close() {
    queue_->open = false;
  }

 private:
  std::shared_ptr<ClosableQueue<T>> queue_;
};

}  // namespace voxeloo::gaia
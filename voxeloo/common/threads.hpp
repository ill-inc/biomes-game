#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <functional>
#include <future>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <thread>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::threads {

template <typename Value>
class MPMCQueue {
 public:
  MPMCQueue() : closed_(false) {}

  bool is_open() const {
    std::lock_guard lock(mutex_);
    return !closed_;
  }

  bool is_empty() const {
    std::lock_guard lock(mutex_);
    return queue_.empty();
  }

  auto size() const {
    std::lock_guard lock(mutex_);
    return queue_.size();
  }

  void close() {
    {
      std::lock_guard lock(mutex_);
      closed_ = true;
      queue_.clear();
    }
    cv_.notify_all();
  }

  void push(Value value) {
    {
      std::lock_guard lock(mutex_);
      CHECK_STATE(!closed_);
      queue_.push_back(std::move(value));
    }
    cv_.notify_one();
  }

  auto pop() {
    std::unique_lock<std::mutex> lock(mutex_);
    std::optional<Value> ret;
    while (!closed_) {
      if (!queue_.empty()) {
        ret = std::move(queue_.front());
        queue_.pop_front();
        break;
      } else {
        cv_.wait(lock);
      }
    }
    return ret;
  }

 private:
  mutable std::mutex mutex_;
  std::condition_variable cv_;
  std::deque<Value> queue_;
  bool closed_;
};

class QueueExecutor {
 public:
  explicit QueueExecutor(size_t thread_count) : finished_workers_(0) {
    CHECK_ARGUMENT(thread_count > 0);
    for (size_t i = 0; i < thread_count; i += 1) {
      workers_.emplace_back([&] {
        while (auto task = task_queue_.pop()) {
          (*task)();
        }
        finished_workers_ += 1;
      });
    }
  }

  ~QueueExecutor() {
    task_queue_.close();
    for (auto& worker : workers_) {
      worker.join();
    }
  }

  auto size() {
    return task_queue_.size();
  }

  bool is_done() {
    return workers_.size() == finished_workers_;
  }

  void close() {
    return task_queue_.close();
  }

  template <typename Function>
  auto run(Function&& fn) {
    CHECK_STATE(task_queue_.is_open());
    auto promise = std::make_shared<std::promise<decltype(fn())>>();
    auto ret = promise->get_future();
    task_queue_.push(make_task(std::forward<Function>(fn), std::move(promise)));
    return ret;
  }

 private:
  template <typename Function>
  auto make_task(Function&& fn, std::shared_ptr<std::promise<void>>&& promise) {
    return [fn = std::forward<Function>(fn),
            promise = std::move(promise)]() mutable {
      try {
        fn();
        promise->set_value();
      } catch (...) {
        promise->set_exception(std::current_exception());
      }
    };
  }

  template <
      typename Function,
      typename PromiseType,
      typename = std::enable_if_t<!std::is_void_v<PromiseType>>>
  auto make_task(
      Function&& fn, std::shared_ptr<std::promise<PromiseType>>&& promise) {
    return [fn = std::forward<Function>(fn),
            promise = std::move(promise)]() mutable {
      try {
        promise->set_value(fn());
      } catch (...) {
        promise->set_exception(std::current_exception());
      }
    };
  }

  std::atomic<size_t> finished_workers_;
  std::vector<std::thread> workers_;
  MPMCQueue<std::function<void()>> task_queue_;
};

inline auto cores() {
  return std::thread::hardware_concurrency();
}

inline QueueExecutor& async_executor() {
  static const auto executor = std::make_unique<QueueExecutor>(1);
  return *executor;
}

template <typename Fn>
inline auto async(Fn&& fn) {
  return async_executor().run(std::forward<Fn>(fn));
}

template <typename Fn>
inline auto async_await(Fn&& fn) {
  return async_executor().run(std::forward<Fn>(fn)).get();
}

inline auto async_flush() {
  return async_executor().run([] {}).wait();
}

// Invokes the given function in b batches in parallel.
template <typename Fn>
inline void parallel_do(uint32_t b, Fn&& fn) {
  static const auto thread_count = cores();
  static const auto executor = std::make_unique<QueueExecutor>(thread_count);

  // Allocate a task for each thread.
  std::vector<std::future<void>> futures;
  for (uint32_t i = 0; i < b; i += 1) {
    futures.push_back(executor->run([&fn, i] {
      fn(i);
    }));
  }

  // Wait for all tasks to finish before returning.
  for (auto& future : futures) {
    future.get();
  }
}

// Invokes the given function once per logical core.
template <typename Fn>
inline void parallel_do(Fn&& fn) {
  parallel_do(threads::cores(), std::forward<Fn>(fn));
}

// Partitions the range [0, n) into b batches and invokes the given function on
// each batch in parallel (up to some number of threads).
template <typename Fn>
inline void parallel_for(uint32_t n, uint32_t b, Fn&& fn) {
  CHECK_ARGUMENT(b <= n);
  parallel_do(b, [&fn, b, n](uint32_t i) {
    auto l = static_cast<uint64_t>(n) * i / b;
    auto r = static_cast<uint64_t>(n) * (i + 1) / b;
    fn(static_cast<uint32_t>(l), static_cast<uint32_t>(r));
  });
}

// Parallel for with an implementation defined number of batches.
template <typename Fn>
inline void parallel_for(uint32_t n, Fn&& fn) {
  parallel_for(n, std::min<uint32_t>(n, 8 * cores()), std::forward<Fn>(fn));
}

template <typename T>
class Synchronized {
 public:
  template <typename... Args>
  Synchronized(Args&&... args) : t_(std::forward<Args>(args)...) {}  // NOLINT

  template <typename Fn>
  auto apply(Fn&& fn) {
    std::lock_guard lock(m_);
    return fn(t_);
  }

  template <typename Fn>
  auto apply(Fn&& fn) const {
    std::lock_guard lock(m_);
    return fn(t_);
  }

  const T& get() const& {
    return t_;
  }
  T get() && {
    return std::move(t_);
  }

 private:
  T t_;
  mutable std::mutex m_;
};

// A simple scope guard for RAII.
template <typename Fn>
class Guard {
 public:
  explicit Guard(Fn&& fn) : fn_(std::forward<Fn>(fn)) {}
  ~Guard() {
    fn_();
  }

 private:
  Fn fn_;
};

// A thread-safe rate limiting utility. The gate function is thread safe and
// can be called any number of times. It will return true exactly once every
// period (where the period duration is specified at construction).
class Throttle {
 public:
  explicit Throttle(float period_secs)
      : period_(period_secs), prev_(std::chrono::steady_clock::now()) {}

  bool gate() const {
    if (std::chrono::steady_clock::now() - prev_ > period_) {
      if (auto l = std::unique_lock(mutex_, std::try_to_lock)) {
        if (std::chrono::steady_clock::now() - prev_ > period_) {
          prev_ = std::chrono::steady_clock::now();
          return false;
        }
      }
    }
    return true;
  }

 private:
  const std::chrono::duration<float> period_;
  mutable std::chrono::time_point<std::chrono::steady_clock> prev_;
  mutable std::mutex mutex_;
};

// Basic semaphore concurrency primitive.
class Semaphore {
 public:
  explicit Semaphore(size_t init = 0) : count_(init) {}

  void notify() {
    std::unique_lock<decltype(mutex_)> lock(mutex_);
    count_ += 1;
    cv_.notify_one();
  }

  void wait() {
    std::unique_lock<decltype(mutex_)> lock(mutex_);
    while (!count_) {
      cv_.wait(lock);
    }
    count_ -= 1;
  }

  bool try_wait() {
    std::unique_lock<decltype(mutex_)> lock(mutex_);
    if (count_) {
      count_ -= 1;
      return true;
    }
    return false;
  }

 private:
  size_t count_;
  std::mutex mutex_;
  std::condition_variable cv_;
};

// Wraps tasks with a limit on concurrent calls.
class Limiter {
 public:
  explicit Limiter(size_t limit = 1) : semaphore_(limit) {}

  template <typename Fn>
  void try_apply(Fn&& fn) const {
    if (semaphore_.try_wait()) {
      Guard guard([&] {
        semaphore_.notify();
      });
      fn();
    }
  }

  template <typename Fn>
  void apply(Fn&& fn) const {
    semaphore_.wait();
    Guard guard([&] {
      semaphore_.notify();
    });
    fn();
  }

 private:
  mutable Semaphore semaphore_;
};

// Wraps async tasks with a limit on concurrent calls.
class AsyncLimiter {
 public:
  explicit AsyncLimiter(size_t limit = 1) : limiter_(limit) {}

  template <typename Fn>
  void try_apply(Fn&& fn) const {
    limiter_.try_apply([this, fn = std::forward<Fn>(fn)]() mutable {
      threads::async(std::forward<Fn>(fn));
    });
  }

  template <typename Fn>
  void apply(Fn&& fn) const {
    threads::async([this, fn = std::forward<Fn>(fn)]() mutable {
      limiter_.apply(std::forward<Fn>(fn));
    });
  }

 private:
  mutable Limiter limiter_;
};

}  // namespace voxeloo::threads

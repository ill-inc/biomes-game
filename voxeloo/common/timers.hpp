#pragma once

#include <chrono>
#include <iostream>

#include "voxeloo/common/random.hpp"

namespace voxeloo::timers {

using TimerDuration = std::chrono::duration<float, std::milli>;

template <typename Fn>
class CallbackTimer {
 public:
  explicit CallbackTimer(Fn&& fn)
      : start_(std::chrono::steady_clock::now()), fn_(std::forward<Fn>(fn)) {}

  ~CallbackTimer() {
    auto duration = std::chrono::steady_clock::now() - start_;
    fn_(std::chrono::duration_cast<TimerDuration>(duration).count());
  }

 private:
  std::chrono::steady_clock::time_point start_;
  Fn fn_;
};

inline auto simple_timer(const char* msg, float rate = 1.0f) {
  return CallbackTimer([msg, rate](float ms) {
    if (random::uniform_real<float>() <= rate) {
      std::cout << "Timer[" << msg << "]: " << ms << "ms" << std::endl;
    }
  });
}

}  // namespace voxeloo::timers

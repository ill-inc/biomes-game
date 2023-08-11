#pragma once

#include <functional>
#include <optional>
#include <string>
#include <utility>

#include "voxeloo/common/format.hpp"

namespace voxeloo::gaia {

using LogFn = std::function<void(const std::string&)>;

class Logger {
 public:
  explicit Logger(LogFn log) : log_(std::move(log)) {}
  Logger() : Logger([](const std::string&) {}) {}

  template <typename... Args>
  void log(Args... args) const {
    return log_(stringify(std::forward<Args>(args)...));
  }

 private:
  LogFn log_;
};

}  // namespace voxeloo::gaia
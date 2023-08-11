#include "voxeloo/common/errors.hpp"

#include <functional>
#include <vector>

namespace {
std::vector<std::function<void(const std::string&)>> loggers;

auto location(const char* file, int line) {
  std::stringstream ss;
  ss << file << ":" << line;
  return ss.str();
}
}  // namespace

namespace voxeloo::errors {

void register_error_logger(std::function<void(const std::string&)> callback) {
  loggers.push_back(callback);
}

void delegate_error_logger(const std::string& s) {
  for (auto& logger : loggers) {
    logger(s);
  }
}

void state_error(const char* msg, const char* file, int line) {
  std::stringstream ss;
  ss << "State error \"" << msg << "\" at " << location(file, line);
  voxeloo::errors::delegate_error_logger(ss.str());
  throw std::logic_error(ss.str());
}

void argument_error(const char* msg, const char* file, int line) {
  std::stringstream ss;
  ss << "Argument error \"" << msg << "\" at " << location(file, line);
  voxeloo::errors::delegate_error_logger(ss.str());
  throw std::invalid_argument(ss.str());
}

void unreachable_error(const char* msg, const char* file, int line) {
  std::stringstream ss;
  ss << "Unreachable error \"" << msg << "\" at " << location(file, line);
  voxeloo::errors::delegate_error_logger(ss.str());
  std::cout << ss.str();
  std::terminate();
}

}  // namespace voxeloo::errors
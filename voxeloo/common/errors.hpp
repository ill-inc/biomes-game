#pragma once

#include <functional>
#include <iostream>
#include <sstream>

#include "voxeloo/common/macros.hpp"

namespace voxeloo::errors {

void register_error_logger(std::function<void(const std::string&)> logger);
void delegate_error_logger(const std::string& s);

#define THROWS NORETURN NOINLINE

THROWS void state_error(const char* msg, const char* file, int line);
THROWS void argument_error(const char* msg, const char* file, int line);
THROWS void unreachable_error(const char* msg, const char* file, int line);

}  // namespace voxeloo::errors

#define CHECK_STATE(cond)                             \
  do {                                                \
    if (UNLIKELY(!(cond))) {                          \
      errors::state_error(#cond, __FILE__, __LINE__); \
    }                                                 \
  } while (0)

#define CHECK_ARGUMENT(cond)                             \
  do {                                                   \
    if (UNLIKELY(!(cond))) {                             \
      errors::argument_error(#cond, __FILE__, __LINE__); \
    }                                                    \
  } while (0)

#define CHECK_UNREACHABLE(msg)                          \
  do {                                                  \
    errors::unreachable_error(msg, __FILE__, __LINE__); \
  } while (0)

#pragma once

#include <cstdint>
#include <sstream>
#include <string>
#include <string_view>

#include "voxeloo/common/errors.hpp"

namespace voxeloo::js::memory {

// Total amount of memory currently available to the Emscripten process. This
// may grow on demand, depending on the build settings.
uint32_t get_total_memory();
// Amount of memory currently in use (e.g. not-yet-free()'d malloc()s). Can
// never be more than get_total_memory().
uint32_t get_used_memory();

int do_leak_check();

}  // namespace voxeloo::js::memory

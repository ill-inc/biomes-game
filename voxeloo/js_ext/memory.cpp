// Tests that we can use the dlmalloc mallinfo() function to obtain information
// about malloc()ed blocks and compute how much memory is used/freed.

#include "voxeloo/js_ext/memory.hpp"

#include <assert.h>
#include <emscripten/emscripten.h>
#include <sanitizer/lsan_interface.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

namespace voxeloo::js::memory {

// A lot of this code is based off of the Emscripten documentation at:
//   https://emscripten.org/docs/porting/Debugging.html#memory
// and in particulary their provided example code:
//   https://github.com/emscripten-core/emscripten/blob/9bb322f8a7ee89d6ac67e828b9c7a7022ddf8de2/tests/mallinfo.cpp

struct s_mallinfo {  // NOLINT(readability-identifier-naming)
  int arena;         /* non-mmapped space allocated from system */
  int ordblks;       /* number of free chunks */
  int smblks;        /* always 0 */
  int hblks;         /* always 0 */
  int hblkhd;        /* space in mmapped regions */
  int usmblks;       /* maximum total allocated space */
  int fsmblks;       /* always 0 */
  int uordblks;      /* total allocated space */
  int fordblks;      /* total free space */
  int keepcost;      /* releasable (via malloc_trim) space */
};

extern "C" {
extern s_mallinfo mallinfo();  // NOLINT(readability-identifier-naming)
}

uint32_t get_total_memory() {
  return EM_ASM_INT(return HEAP8.length);
}

uint32_t get_used_memory() {
  // Returns the amount of virtual memory (in bytes) allocated to the process.
  s_mallinfo i = mallinfo();  // NOLINT(readability-identifier-naming)

  // Bytes currently mapped to physical pages and available to dlmalloc.
  uint32_t mapped_bytes = reinterpret_cast<uint32_t>(sbrk(0));

  // Bytes currently mapped to physical pages, but not reserved by a call
  // to malloc(). Likely this was memory that once was malloc'd but then
  // later freed.
  return mapped_bytes - i.fordblks;
}

int do_leak_check() {
#if defined(__has_feature)
#if __has_feature(address_sanitizer)
  return __lsan_do_recoverable_leak_check();
#endif
#endif
  return 0;
}
}  // namespace voxeloo::js::memory

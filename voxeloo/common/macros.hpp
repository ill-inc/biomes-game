#pragma once

#define ATTR_UNUSED [[maybe_unused]]
#define NORETURN [[noreturn]]

#ifdef _MSC_VER
#define NOINLINE __declspec(noinline)
#elif defined(__GNUC__)
#define NOINLINE __attribute__((__noinline__))
#else
#define NOINLINE
#endif

#if defined(__GNUC__)
#define LIKELY(x) (__builtin_expect((x), 1))
#define UNLIKELY(x) (__builtin_expect((x), 0))
#else
#define LIKELY(x) (x)
#define UNLIKELY(x) (x)
#endif

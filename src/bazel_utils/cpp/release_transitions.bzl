"""Defines rules that transition Emscripten builds into debug/reldebug/release.

This lets all Emscripten wasm builds can be compiled in the same `bazel build`
call, which enables them to all be built in parallel.
"""

load("//src/bazel_utils:common.bzl", "define_forwarding_transition")

_COMMON_CXXOPT = ["-std=c++20", "-Wno-c++20-extensions"]

transition_release_cpp = define_forwarding_transition({
    "debug": {
        "//command_line_option:compilation_mode": "dbg",
        "//command_line_option:copt": ["-g"],
        "//command_line_option:cxxopt": _COMMON_CXXOPT,
        "//command_line_option:linkopt": [],
    },
    "reldebug": {
        "//command_line_option:compilation_mode": "opt",
        "//command_line_option:copt": ["-g", "-O3"],
        "//command_line_option:cxxopt": _COMMON_CXXOPT,
        "//command_line_option:linkopt": [
            "-g",
            # Ignore warnings about limited optimizations due to -g being set.
            "-Wno-limited-postlink-optimizations",
        ],
    },
    "release": {
        "//command_line_option:compilation_mode": "opt",
        "//command_line_option:copt": ["-O3"],
        "//command_line_option:cxxopt": _COMMON_CXXOPT,
        "//command_line_option:linkopt": [],
    },
    "fastbuild": {
        "//command_line_option:compilation_mode": "fastbuild",
        "//command_line_option:copt": [],
        "//command_line_option:cxxopt": _COMMON_CXXOPT,
        "//command_line_option:linkopt": [],
    },
})

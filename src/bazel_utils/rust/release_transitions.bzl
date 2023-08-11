"""Defines rules that transition Rust builds into debug/reldebug/release.

This is primarily used to express Rust Wasm targets for multiple different
builds.
"""

load("//src/bazel_utils:common.bzl", "define_forwarding_transition")

transition_release_rust = define_forwarding_transition({
    "debug": {
        "//command_line_option:compilation_mode": "dbg",
    },
    "release": {
        "//command_line_option:compilation_mode": "opt",
    },
})

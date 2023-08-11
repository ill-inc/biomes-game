package(default_visibility = ["//visibility:public"])

cc_library(
    name = "opensimplex",
    srcs = glob(["OpenSimplexNoise/*.cpp"]),
    hdrs = glob(["OpenSimplexNoise/*.h"]),
    copts = [
        "-IOpenSimplexNoise",
    ] + select({
        "@bazel_tools//src/conditions:windows": [],
        "//conditions:default": [
            "-Wno-narrowing",
            "-Wno-unused-private-field",
        ],
    }),
    includes = ["OpenSimplexNoise"],
)

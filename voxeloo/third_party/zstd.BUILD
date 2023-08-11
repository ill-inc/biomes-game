package(default_visibility = ["//visibility:public"])

cc_library(
    name = "zstd",
    deps = [
        ":common",
        ":compress",
        ":decompress",
        ":deprecated",
        ":zstd_header",
    ],
)

cc_library(
    name = "zdict",
    srcs = glob(["lib/dictBuilder/*.c"]),
    hdrs = [
        "lib/dictBuilder/cover.h",
        "lib/dictBuilder/divsufsort.h",
        "lib/dictBuilder/zdict.h",
    ],
    copts = [
        "-DXXH_NAMESPACE=ZSTD_",
    ],
    strip_include_prefix = "lib/dictBuilder",
    deps = [":common"],
)

cc_library(
    name = "debug",
    srcs = ["lib/common/debug.c"],
    hdrs = ["lib/common/debug.h"],
    strip_include_prefix = "lib/common",
)

cc_library(
    name = "bitstream",
    hdrs = ["lib/common/bitstream.h"],
    strip_include_prefix = "lib/common",
)

cc_library(
    name = "compiler",
    hdrs = ["lib/common/compiler.h"],
    strip_include_prefix = "lib/common",
)

cc_library(
    name = "cpu",
    hdrs = ["lib/common/cpu.h"],
)

cc_library(
    name = "errors",
    srcs = ["lib/common/error_private.c"],
    hdrs = [
        "lib/common/error_private.h",
        "lib/common/zstd_errors.h",
    ],
    strip_include_prefix = "lib/common",
)

cc_library(
    name = "mem",
    hdrs = [
        "lib/common/mem.h",
    ],
    strip_include_prefix = "lib/common",
)

cc_library(
    name = "legacy",
    srcs = glob(["lib/legacy/*.c"]),
    hdrs = glob(["lib/legacy/*.h"]),
    copts = [
        "-DZSTD_LEGACY_SUPPORT=4",
        "-DXXH_NAMESPACE=ZSTD_",
    ],
    deps = [":common"],
)

cc_library(
    name = "decompress",
    srcs = glob(["lib/decompress/zstd*.c"]) + [
        "lib/decompress/zstd_decompress_block.h",
        "lib/decompress/zstd_decompress_internal.h",
        "lib/decompress/zstd_ddict.h",
    ],
    hdrs = glob(["lib/decompress/*_impl.h"]),
    copts = [
        "-DXXH_NAMESPACE=ZSTD_",
    ],
    strip_include_prefix = "lib/decompress",
    deps = [
        ":common",
        ":legacy",
    ],
)

cc_library(
    name = "deprecated",
    srcs = glob(["lib/deprecated/*.c"]),
    hdrs = glob(["lib/deprecated/*.h"]),
    deps = [":common"],
)

cc_library(
    name = "compress",
    srcs = [
        "lib/compress/hist.c",
        "lib/compress/zstd_compress.c",
        "lib/compress/zstd_compress_literals.c",
        "lib/compress/zstd_compress_sequences.c",
        "lib/compress/zstd_double_fast.c",
        "lib/compress/zstd_fast.c",
        "lib/compress/zstd_lazy.c",
        "lib/compress/zstd_ldm.c",
        "lib/compress/zstd_opt.c",
        "lib/compress/zstdmt_compress.c",
    ],
    hdrs = [
        "lib/compress/zstd_compress_internal.h",
        "lib/compress/zstd_compress_literals.h",
        "lib/compress/zstd_compress_sequences.h",
        "lib/compress/zstd_cwksp.h",
        "lib/compress/zstd_double_fast.h",
        "lib/compress/zstd_fast.h",
        "lib/compress/zstd_lazy.h",
        "lib/compress/zstd_ldm.h",
        "lib/compress/zstd_opt.h",
        "lib/compress/zstdmt_compress.h",
    ],
    copts = [
        "-DXXH_NAMESPACE=ZSTD_",
    ],
    deps = [":common"],
)

cc_library(
    name = "hist",
    hdrs = ["lib/compress/hist.h"],
    strip_include_prefix = "lib/compress",
)

cc_library(
    name = "threading",
    srcs = ["lib/common/threading.c"],
    hdrs = ["lib/common/threading.h"],
    copts = ["-DZSTD_MULTITHREAD"],
    linkopts = ["-pthread"],
    deps = [":debug"],
)

cc_library(
    name = "pool",
    srcs = ["lib/common/pool.c"],
    hdrs = ["lib/common/pool.h"],
    deps = [
        ":debug",
        ":threading",
        ":zstd_common",
    ],
)

cc_library(
    name = "xxhash",
    srcs = ["lib/common/xxhash.c"],
    hdrs = [
        "lib/common/xxhash.h",
    ],
    copts = [
        "-DXXH_NAMESPACE=ZSTD_",
    ],
)

cc_library(
    name = "zstd_header",
    hdrs = ["lib/zstd.h"],
    strip_include_prefix = "lib",
)

cc_library(
    name = "zstd_common",
    srcs = ["lib/common/zstd_common.c"],
    hdrs = [
        "lib/common/zstd_internal.h",
    ],
    deps = [
        ":compiler",
        ":debug",
        ":entropy",
        ":errors",
        ":mem",
        ":zstd_header",
    ],
)

cc_library(
    name = "entropy",
    srcs = [
        "lib/common/entropy_common.c",
        "lib/common/fse_decompress.c",
        "lib/compress/fse_compress.c",
        "lib/compress/huf_compress.c",
        "lib/decompress/huf_decompress.c",
    ],
    hdrs = [
        "lib/common/fse.h",
        "lib/common/huf.h",
    ],
    includes = ["lib/common"],
    deps = [
        ":bitstream",
        ":compiler",
        ":debug",
        ":errors",
        ":hist",
        ":mem",
        ":threading",
        ":xxhash",
    ],
)

cc_library(
    name = "common",
    deps = [
        ":bitstream",
        ":compiler",
        ":cpu",
        ":debug",
        ":entropy",
        ":errors",
        ":mem",
        ":pool",
        ":threading",
        ":xxhash",
        ":zstd_common",
    ],
)

cc_library(
    name = "util",
    hdrs = ["programs/util.h"],
    deps = [
        ":mem",
        ":platform",
    ],
)

cc_library(
    name = "datagen",
    srcs = ["programs/datagen.c"],
    hdrs = ["programs/datagen.h"],
    deps = [
        ":mem",
        ":platform",
    ],
)

cc_library(
    name = "platform",
    hdrs = ["programs/platform.h"],
)

cc_library(
    name = "zstd_lib",
    srcs = glob(
        ["programs/*.c"],
        exclude = [
            "programs/datagen.c",
            "programs/zstdcli.c",
        ],
    ),
    hdrs = glob(
        ["programs/*.h"],
        exclude = [
            "programs/datagen.h",
            "programs/platform.h",
            "programs/util.h",
        ],
    ),
    copts = [
        "-DZSTD_GZCOMPRESS",
        "-DZSTD_GZDECOMPRESS",
        "-DZSTD_LZMACOMPRESS",
        "-DZSTD_LZMADECOMPRES",
        "-DZSTD_LZ4COMPRESS",
        "-DZSTD_LZ4DECOMPRES",
        "-DXXH_NAMESPACE=ZSTD_",
    ],
    linkopts = [
        "-lz",
        "-llzma",
        "-llz4",
    ],
    deps = [
        ":datagen",
        ":libzstd",
        ":mem",
        ":util",
        ":xxhash",
        ":zdict",
    ],
)

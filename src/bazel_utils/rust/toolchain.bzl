load("@bazel_skylib//lib:paths.bzl", "paths")

# Helper function to get access to the toolchain's selection of rustfmt, to
# having to hardcode platform-specific paths like:
#   @rust_linux_x86_64__x86_64-unknown-linux-gnu__stable_tools//:rustfmt
# in places.
def _rustfmt_bin_impl(ctx):
    toolchain = ctx.toolchains["@rules_rust//rust:toolchain"]
    link = ctx.actions.declare_file(paths.join(ctx.label.name, toolchain.rustfmt.path))
    ctx.actions.symlink(output = link, target_file = toolchain.rustfmt, is_executable = True)

    return [DefaultInfo(executable = link)]

rustfmt_bin = rule(
    implementation = _rustfmt_bin_impl,
    executable = True,
    toolchains = [
        "@rules_rust//rust:toolchain",
    ],
)

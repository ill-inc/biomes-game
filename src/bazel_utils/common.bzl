"""Helper functions for our Bazel files.
"""

load("@bazel_skylib//lib:paths.bzl", "paths")

def flatten(input_list):
    return [item for sublist in input_list for item in sublist]

def _sub_filegroup_impl(ctx):
    for label in ctx.attr.srcs:
        for file in label.files.to_list():
            if file not in ctx.files.parent:
                fail("Label '%s' includes files not in the parent target '%s'." % (label, ctx.attr.parent))

    return DefaultInfo(files = depset(ctx.files.srcs))

sub_filegroup = rule(
    implementation = _sub_filegroup_impl,
    attrs = {
        "parent": attr.label(mandatory = True),
        "srcs": attr.label_list(mandatory = True),
    },
)

def forward_files(ctx, src_files):
    # Copy incoming files into new directory so that if this rule is used
    # multiple times with different parameters, there will be no conflicts.
    new_files = []
    for file in src_files:
        new_file = ctx.actions.declare_file(paths.join(ctx.label.name, file.basename))
        ctx.actions.symlink(
            output = new_file,
            target_file = file,
        )
        new_files.append(new_file)

    return DefaultInfo(files = depset(new_files))

def _copy_files_to_directory_impl(ctx):
    return forward_files(ctx, ctx.files.target)

copy_files_to_directory = rule(
    implementation = _copy_files_to_directory_impl,
    attrs = {
        "target": attr.label(mandatory = True, providers = [DefaultInfo]),
    },
)

def define_forwarding_transition(settings_per_mode):
    """
    Generates a Bazel transition rule that forwards from an existing target.

    A specified set of transition outputs can be specified according to a set
    of choices specified as the `mode` attribute of the generated rule. Targets will
    land in a subdirectory named with the rule's name.

    Great for adjusting different release flavors for wasm binaries.

    Args:
        settings_per_mode (Dict): A mapping from modes to the transition
            settings changes that they imply.

    Returns:
        A Bazel rule that applies these transitions.
    """

    def _forwarding_transition_impl(_settings, attr):
        return settings_per_mode[attr.mode]

    # All choices must specify all outputs.
    transition_outputs = depset(flatten(settings_per_mode.values()))

    _forwarding_transition = transition(
        implementation = _forwarding_transition_impl,
        inputs = [],
        outputs = transition_outputs.to_list(),
    )

    def _transition_release_impl(ctx):
        return forward_files(ctx, ctx.files.target)

    return rule(
        implementation = _transition_release_impl,
        attrs = {
            "target": attr.label(
                cfg = _forwarding_transition,
                mandatory = True,
            ),
            "mode": attr.string(
                values = list(settings_per_mode.keys()),
                mandatory = True,
            ),
            "_allowlist_function_transition": attr.label(
                default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
            ),
        },
    )

def _apply_prettier_impl(ctx):
    out_files = []

    for src in ctx.files.srcs:
        src_rel = paths.relativize(
            src.path,
            paths.join(ctx.bin_dir.path, ctx.label.package, ctx.attr.base_dir),
        )
        out_path = paths.join(ctx.attr.out_dir, src_rel)

        out_file = ctx.actions.declare_file(out_path)

        ctx.actions.run_shell(
            outputs = [out_file],
            inputs = [src],
            tools = [ctx.executable._node] + ctx.files._prettier_files,
            progress_message = "Prettier-ifying '%s'" % src_rel,
            arguments = [
                ctx.executable._node.path,
                src.path,
                out_file.path,
            ],
            command = "$1 node_modules/prettier/bin-prettier.js $2 > $3",
        )
        out_files.append(out_file)

    return DefaultInfo(files = depset(out_files))

apply_prettier = rule(
    implementation = _apply_prettier_impl,
    attrs = {
        "srcs": attr.label_list(
            mandatory = True,
            allow_empty = False,
            allow_files = [".ts", ".tsx", ".js", ".jsx"],
        ),
        "base_dir": attr.string(
            mandatory = True,
            doc = "The directory that the output path for each src file will be deduced relative to. All srcs must have this directory as an ancestor.",
        ),
        "out_dir": attr.string(
            doc = "The directory that the output files will be placed in.",
            default = ".",
        ),
        "_node": attr.label(
            default = "@nodejs//:node",
            executable = True,
            cfg = "exec",
            allow_files = True,
        ),
        "_prettier_files": attr.label(
            default = "//:prettier_files",
            allow_files = True,
        ),
    },
)

"""
Helper functions for shader parsing/compilation/generation.
"""

load("@bazel_skylib//lib:paths.bzl", "paths")
load("//src/bazel_utils:common.bzl", "apply_prettier")

ShaderLibInfo = provider(
    doc = "Represents a GLSL shader library that shader programs can depend on.",
    fields = {
        "files": "A depset of the transitive srcs and deps of the library.",
    },
)

def _shader_lib_impl(ctx):
    files = depset(
        ctx.files.srcs,
        transitive = [dep[ShaderLibInfo].files for dep in ctx.attr.deps],
    )
    return [
        DefaultInfo(files = files),
        ShaderLibInfo(files = files),
    ]

shader_lib = rule(
    implementation = _shader_lib_impl,
    attrs = {
        "srcs": attr.label_list(
            mandatory = True,
            allow_files = [".glsl"],
            allow_empty = False,
        ),
        "deps": attr.label_list(
            providers = [ShaderLibInfo],
        ),
    },
)

def _shader_program_impl(ctx):
    out_dir_file = ctx.actions.declare_directory(ctx.attr.out_dir)
    shader_name = ctx.attr.shader_name or ctx.label.name

    base_file = ctx.actions.declare_file(
        paths.join(ctx.attr.out_dir, shader_name + ".ts"),
    )
    shader_file = ctx.actions.declare_file(
        paths.join(ctx.attr.out_dir, shader_name + "_shaders.ts"),
    )

    inputs = depset(
        ctx.files.material_file + ctx.files.srcs,
        transitive = [dep[ShaderLibInfo].files for dep in ctx.attr.deps],
    )

    ctx.actions.run(
        outputs = [
            base_file,
            shader_file,
            out_dir_file,
        ],
        inputs = inputs,
        tools = [ctx.executable._gen_tool, ctx.executable._glslang_validator],
        arguments = [
            "--name=%s" % shader_name,
            "--material-file=%s" % ctx.files.material_file[0].path,
            "--out-dir=%s" % paths.dirname(base_file.path),
            "--glslang-validator=%s" % ctx.executable._glslang_validator.path,
        ] + (
            ["--galois"] if ctx.attr.galois else []
        ),
        progress_message = "Generating shader '%s'" % ctx.label.name,
        executable = ctx.executable._gen_tool,
    )

    return DefaultInfo(files = depset([base_file, shader_file]))

_shader_program = rule(
    implementation = _shader_program_impl,
    attrs = {
        "srcs": attr.label_list(
            mandatory = True,
            allow_files = [".fs", ".vs"],
            allow_empty = False,
        ),
        "deps": attr.label_list(
            providers = [ShaderLibInfo],
        ),
        "galois": attr.bool(),
        "material_file": attr.label(
            mandatory = True,
            allow_files = [".material.json"],
        ),
        "out_dir": attr.string(mandatory = True),
        "shader_name": attr.string(),
        "_gen_tool": attr.label(
            default = "//src/bazel_utils/shaders:shader_gen_ts",
            executable = True,
            cfg = "exec",
        ),
        "_glslang_validator": attr.label(
            default = "@glslang//:glslangValidator",
            executable = True,
            cfg = "exec",
            allow_files = True,
        ),
    },
)

def shader_program(name, **kwargs):
    not_pretty_dir = "%s_not_pretty" % name
    not_pretty_name = "%s_not_pretty" % name
    _shader_program(
        name = not_pretty_name,
        shader_name = name,
        out_dir = not_pretty_name,
        **kwargs
    )
    apply_prettier(
        name = name,
        srcs = [":%s" % not_pretty_name],
        base_dir = not_pretty_name,
    )

def galois_shader_program(**kwargs):
    shader_program(galois = True, **kwargs)

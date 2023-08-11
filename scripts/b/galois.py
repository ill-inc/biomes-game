import os
import subprocess
import sys
from functools import update_wrapper
from pathlib import Path

import b
import click
from pip_install_voxeloo import ensure_pip_install_voxeloo


@click.group()
@click.option(
    "--pip-install-voxeloo/--no-pip-install-voxeloo",
    help="Whether or not `pip install ./voxeloo` will get called before commands that need it.",
    default=True,
)
@click.pass_context
def galois(ctx, pip_install_voxeloo: bool):
    """Commands for managing Galois and its assets."""
    ctx.ensure_object(dict)
    if not pip_install_voxeloo:
        ctx.obj["VOXELOO_BUILT"] = True


@galois.command()
@click.pass_context
def build(ctx):
    """Build Galois components."""
    ctx.invoke(viewer_build)
    ctx.invoke(editor_build)


@galois.command(
    context_settings=dict(
        # Forward all CLI parameters to the command.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.argument("args", nargs=-1)
@click.pass_context
def lint(ctx, args):
    """Lint Galois sources."""
    ctx.invoke(b.lint_ts, args=["--dir", "src/galois/js"] + list(args))


@galois.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.argument("args", nargs=-1)
@click.pass_context
def test(ctx, args):
    """Run Galois tests."""
    ctx.invoke(b.test, path="src/galois/**/test/*.ts", args=args)


@galois.group()
def assets():
    """Galois commands for managing/building assets."""
    pass


@assets.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.argument("args", nargs=-1)
def dump(args):
    """Dumps Galois query for a given asset to stdout."""
    b.wait_or_die(
        b.run_node("src/galois/js/assets/scripts/dump.ts", args=list(args))
    )


@assets.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.argument("args", nargs=-1)
def export(args):
    """Builds specific assets and puts the output on the local disk."""
    b.wait_or_die(
        b.run_node("src/galois/js/assets/scripts/export.ts", args=list(args))
    )


@assets.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@ensure_pip_install_voxeloo
@click.argument("args", nargs=-1)
def publish(args):
    """Publish all assets, uploading them to GCS."""
    b.wait_or_die(
        b.run_node("src/galois/js/publish/scripts/publish.ts", args=list(args))
    )


@assets.command()
def check_assets_published():
    """Checks that all assets exist in GCS."""
    b.wait_or_die(
        b.run_node("src/galois/js/publish/scripts/check_assets_published.ts")
    )


def run_webpack_cli(config, watch=False):
    return b.run_yarn_env(
        ["webpack-cli", "--config", config] + (["--watch"] if watch else []),
        node_options=["--max-old-space-size=4096"],
    )


@galois.group()
def viewer():
    """Commands related to building/running the viewer app."""
    pass


@viewer.command("start")
@ensure_pip_install_voxeloo
@click.pass_context
def viewer_start(ctx):
    """Build and run the viewer."""
    ctx.invoke(viewer_build)
    b.run_yarn_env(
        ["electron", "dist/galois/viewer/webpack/main.js", "--env=dev"],
        use_common_node_options=False,
    )


@viewer.command("build")
def viewer_build():
    """Build the viewer."""
    run_webpack_cli("src/galois/js/viewer/webpack.config.ts")


@viewer.command("watch")
def viewer_watch():
    """Starts a process to watch for changes and rebuild the viewer."""
    run_webpack_cli("src/galois/js/viewer/webpack.config.ts", watch=True)


@viewer.command("package")
@ensure_pip_install_voxeloo
def viewer_package():
    """Package the viewer into a Windows distributable package."""
    b.wait_or_die(b.run_node("src/galois/js/scripts/winpackage.ts", ["viewer"]))


@galois.group()
def editor():
    """Commands related to building/running the editor app."""
    pass


@editor.command("start")
@ensure_pip_install_voxeloo
@click.pass_context
def editor_start(ctx):
    """Build and run the editor."""
    ctx.invoke(editor_build)
    b.run_yarn_env(
        ["electron", "dist/galois/editor/webpack/main.js", "--env=dev"],
        use_common_node_options=False,
    )


@editor.command("build")
def editor_build():
    """Build the editor."""
    run_webpack_cli("src/galois/js/editor/webpack.config.ts")


@editor.command("watch")
def editor_watch():
    """Starts a process to watch for changes and rebuild the editor."""
    run_webpack_cli("src/galois/js/editor/webpack.config.ts", watch=True)


@editor.command("package")
@ensure_pip_install_voxeloo
def editor_package():
    """Package the editor into a Windows distributable package."""
    b.wait_or_die(b.run_node("src/galois/js/scripts/winpackage.ts", ["editor"]))

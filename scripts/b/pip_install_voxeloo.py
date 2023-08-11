import os
import subprocess
import sys
from functools import update_wrapper
from pathlib import Path

import b
import click


SCRIPT_DIR = Path(os.path.dirname(os.path.realpath(__file__)))
REPO_DIR = SCRIPT_DIR / ".." / ".."


def ensure_pip_install_voxeloo(f):
    """
    Wrapper to make sure voxeloo is built and up-to-date before proceeding.
    """

    @click.pass_context
    def with_check(ctx, *args, **kwargs):
        # Most things that want an up-to-date voxeloo also want up-to-date ts.
        b.ensure_bazel_up_to_date(ctx)
        if "VOXELOO_BUILT" not in ctx.obj:
            run_pip_install_voxeloo()
            ctx.obj["VOXELOO_BUILT"] = True
        return ctx.invoke(f, *args, **kwargs)

    return update_wrapper(with_check, f)


def run_pip_install_voxeloo():
    click.secho("Running `pip install ./voxeloo`...")
    click.secho()
    # We call `python` directly here instead of sys.executable because that's
    # how Galois is going to subsequently access Python.
    result = subprocess.run(
        ["python", "-m", "pip", "install", "./voxeloo"], cwd=REPO_DIR
    )
    if result.returncode != 0:
        sys.exit(result.returncode)

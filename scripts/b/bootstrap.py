#!/usr/bin/env python

import importlib
import shutil
import subprocess
import sys


def check_version():
    version = sys.version_info
    if version.major != 3 or version.minor < 9:
        raise Exception("This script requires Python 3.8 or higher.")


def ensure_deps_are_available(deps):
    for dep in deps:
        if isinstance(dep, tuple):
            install_package = dep[1]
            dep = dep[0]
        else:
            install_package = dep
        try:
            importlib.import_module(dep)
        except:
            print(f"{dep} is not installed. Installing {install_package}...")
            subprocess.run(
                [sys.executable, "-m", "pip", "install", install_package],
                check=True,
            )


def check_git_lfs_is_installed():
    """Check that your local repository used git-lfs correctly."""
    try:
        subprocess.run(
            ["git", "lfs", "version"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except:
        print(
            "git-lfs is not installed. Please install it: https://git-lfs.github.com/"
        )
        print("Once installed, you need to run: git lfs pull")
        sys.exit(1)


def check_bazel_installed():
    """Check that you have Bazel installed."""
    if shutil.which("bazel") == None:
        print(
            "Bazel is not installed. Please install it: https://bazel.build/install"
        )
        print("  An easy way to install it is by running:")
        print()
        print("    npm install -g @bazel/bazelisk")
        print()
        sys.exit(1)


def check_rsync_installed():
    """
    Check that you have rsync installed.

    Used by `deploy_bazel_ts_deps.sh` script to copy files into the /gen
    directory. Should be installed by default on macos, but not necessarily
    Ubuntu (at least not in their Docker image).
    """
    if shutil.which("rsync") == None:
        print(
            "'rsync' is not installed. Please install it (e.g. with `sudo apt install rsync`)."
        )
        sys.exit(1)


def main():
    check_version()
    ensure_deps_are_available(
        [
            "click",
            "click_default_group",
            "psutil",
            ("dotenv", "python-dotenv"),
            "requests",
            "watchfiles",
        ]
    )
    check_git_lfs_is_installed()
    check_bazel_installed()
    check_rsync_installed()

    from b import entrypoint

    entrypoint()


if __name__ == "__main__":
    main()

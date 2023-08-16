#!/usr/bin/env python

import importlib
import shutil
import subprocess
import sys
import os

VENV_PATH = '.venv'

def check_version():
    version = sys.version_info
    if version.major != 3 or version.minor < 8 or version.minor > 10:
        raise Exception("This script requires Python >=3.8,<=3.10")

def check_venv_status(venv_path):
    """Check that the virtual environment exists and is active."""
    if os.path.exists(venv_path):
        print("Virtual environment exists.")
        if 'VIRTUAL_ENV' in os.environ:
            print("Virtual environment is active.")
        else:
            print("Virtual environment is not active. Did you forget to activate it?")
            sys.exit(1)
    else:
        print("Virtual environment does not exist. We recommend you use one.")

def install_requirements():
    subprocess.run('pip install -r requirements.txt', shell=True)

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


def check_git_fls_is_installed():
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

def fetch_git_lfs_files():
    """Fetch the files tracked by git-lfs."""
    try:
        subprocess.run(["git", "lfs", "fetch", "--all"], check=True)
        subprocess.run(["git", "lfs", "checkout"], check=True)
    except:
        print("Failed to fetch and checkout files tracked by git-lfs.")
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
    check_venv_status(VENV_PATH)
    install_requirements()
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
    check_git_fls_is_installed()
    fetch_git_lfs_files()
    check_bazel_installed()
    check_rsync_installed()

    from b import entrypoint

    entrypoint()


if __name__ == "__main__":
    main()
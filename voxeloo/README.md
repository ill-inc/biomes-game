# Building WASM

Run from Biomes repository root, `scripts/build_wasm.sh -t all`

# Working in C++

## Setup

1. Install Bazel, https://bazel.build/install

   - OSX
     - This will be `brew install bazelisk` (or `port install bazelisk`).
   - Windows

     - Recommended to install the latest binary release of bazelisk
       (https://github.com/bazelbuild/bazelisk/releases) and then
       manually add it to your Windows `PATH`.
       Installing via `npm` results in issues with `pip install` not being
       able to find the Bazel binary
     - if running through Git Bash, you will need to `export MSYS_NO_PATHCONV=1`.
     - you will likely also need to point `PYTHON_BIN_PATH` and/or
       `PYTHON_LIB_PATH` to your Python executable, e.g.:
       ```
       export PYTHON_BIN_PATH=C:/Python39/python.exe
       export PYTHON_LIB_PATH=C:/Python39/Lib/
       ```
     - You may also need to point `BAZEL_VC` to your visual C++ install
       directory, e.g.:
       ```
       export BAZEL_VC="C:/Program Files (x86)/Microsoft Visual Studio/2019/BuildTools/VC"
       ```

2. Install the VSCode 'clangd' extension
3. When prompted, disable Intellisense in favour of clangd.

Following instructions are to be run from voxeloo.

## Running tests

`bazel test //...`

## Building everything

`bazel build //...`

## Installing Python extension

Run from Biomes repository root, `pip install ./voxeloo`

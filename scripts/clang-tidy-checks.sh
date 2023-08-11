#!/bin/bash
set -uo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPOSITORY_ROOT=$(realpath ${SCRIPT_DIR}/..)

cd voxeloo
bazel build //... --config clang-tidy
if [[ $? -ne 0 ]]; then
  echo
  # clang-tidy's '--fix' flag doesn't work too great, the developer's time
  # is better spent fixing the issues manually.
  echo "*** clang-tidy errors were detected, please fix them."
  exit 1
else
  echo "No clang-tidy issues detected."
fi

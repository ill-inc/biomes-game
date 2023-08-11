#!/bin/bash
set -uo pipefail

# This file is used by CI to check for clang-format errors, and it can also
# be run by users to fix clang-format errors.

print_usage () {
  echo "Usage: clang-format-checks.sh -[f|c]"
  echo "  -f: modify in-place all files to apply clang-format's suggestions"
  echo "  -c: no modifications take place, but clang-format's suggestions are shown "
}

# This is to support macOS that doesn't have realpath command natively.
realpath2() (
  if ! command -v realpath &> /dev/null
  then
    OURPWD=$PWD
    cd "$(dirname "$1")"
    LINK=$(readlink "$(basename "$1")")
    while [ "$LINK" ]; do
      cd "$(dirname "$LINK")"
      LINK=$(readlink "$(basename "$1")")
    done
    REALPATH="$PWD/$(basename "$1")"
    cd "$OURPWD"
    echo "$REALPATH"
  else
    realpath "$1"
  fi
)

if [[ $# -ne 1 ]]; then
  print_usage
  exit 1
fi

case ${1} in
  "-f")
      FIX_OR_CHECK=fix
      ;;
  "-c")
      FIX_OR_CHECK=check
      ;;
  \?)
    print_usage
    exit 0
    ;;
  *)
    print_usage
    exit 1
    ;;
esac

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPOSITORY_ROOT=$(realpath2 ${SCRIPT_DIR}/..)

# This determines the set of files that clang-format will apply to.
FILES_TO_SCAN=$(find ${REPOSITORY_ROOT} \( \
  -name "*.c" -o \
  -name "*.cpp" -o \
  -name "*.cc" -o \
  -name "*.h" -o \
  -name "*.hpp" \
  \) -not \( \
  -path "*/third_party/*" -o \
  -path "*/node_modules/*" -o \
  -path "*/cmake_out/*" \
  \))

case ${FIX_OR_CHECK} in
  "fix")
    TMPFILE=/tmp/biomes-clang-format-checks
    for FILE in ${FILES_TO_SCAN}; do
      clang-format ${FILE} > ${TMPFILE}
      mv ${TMPFILE} ${FILE}
    done
    ;;
  "check")
    ERRORS=0
    for FILE in ${FILES_TO_SCAN}; do
      diff -u ${FILE} <(clang-format ${FILE})
      if [[ $? -ne 0 ]]; then
        ERRORS=1
      fi
    done
    if [[ ${ERRORS} -ne 0 ]]; then
      echo
      echo "*** The clang-format gods are not pleased."
      echo "***   Run 'scripts/clang-format-checks.sh -f' to fix the errors."
      exit 1
    else
      echo "No clang-format issues detected."
    fi
    ;;
esac

set -ue

# Usage: run-clang-tidy <OUTPUT> [ARGS...]

OUTPUT=$1
shift

# clang-tidy doesn't create a patchfile if there are no errors.
# make sure the output exists, and empty if there are no errors,
# so the build system will not be confused.
touch $OUTPUT
truncate -s 0 $OUTPUT

clang-tidy "$@"
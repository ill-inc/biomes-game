#!/bin/bash
set -euo pipefail

# A path prefix within the Bazel output directory that we'll take as the root
# for all generated files. Bazel-generated files outside of this directory
# will not be deployed.
ROOT_PATH_PREFIX="$(dirname ${ROOT_PREFIX})/"

# This script is intended to be run through Bazel, which will ensure that the
# DEPLOY_FILES environment variable is set to the list of files to deploy.
DESTINATION_DIR=$1

# Make sure all deployed files match the expected ROOT_PATH_PREFIX.
FILES_WITHOUT_ROOT_SUFFIX=$(\
    echo ${DEPLOY_FILES} \
    | sed 's/ /\n/g' \
    | grep -vE "^${ROOT_PATH_PREFIX}") || true

if [[ $(echo ${FILES_WITHOUT_ROOT_SUFFIX} | wc -w) -ne "0" ]]; then
    echo "Generated files must all be within '${ROOT_PATH_PREFIX}'. Exceptions were detected:"
    echo ${FILES_WITHOUT_ROOT_SUFFIX} | sed 's/ /\n/g' | sed 's/^/  /g'
    exit 1
fi


# --min-size=1 configures rsync to ignore files that have a size of 0. This
# is because some Bazel rules (e.g. wasm_cc_binary for Emscripten) generate
# these files even though they're not useful, and it's noisy.
# --out-format="Updating ${DESTINATION_DIR}/%n%L" can be added for more verbose
# output.
echo ${DEPLOY_FILES} \
    | sed 's/ /\n/g' \
    | sed "s#${ROOT_PATH_PREFIX}##g" \
    | rsync -Lzhaiq --min-size=1 --relative --delete --files-from=- ${ROOT_PATH_PREFIX} ${DESTINATION_DIR}

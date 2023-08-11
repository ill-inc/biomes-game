#!/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
REPO_ROOT="${SCRIPTPATH}/../.."

cd ${REPO_ROOT}
./b $@ ts-deps build

#!/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
GLTFPACK_PATH=$SCRIPTPATH/../node_modules/.bin
cd $GLTFPACK_PATH
find $SCRIPTPATH/../public -type f -name "*.glb" ! -path "*.compressed.glb" -exec sh -c './gltfpack -i "$1" -o "${1%.glb}.compressed.glb"' _ {} \;
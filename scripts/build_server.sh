#!/bin/bash

set -e

echo "Building server..."
yarn run webpack-cli --config server.webpack.config.ts

if [ -z "$(ls -A dist/)" ]; then
    echo "EXPECTED dist/ to be non-empty"
    exit 1
fi
echo "Reticulating splines.."
echo "Copying over WASM..."

WASM_TARGET=voxeloo-simd
WASM_DST_DIR=dist/gen/shared/cpp_ext/$WASM_TARGET
WASM_SRC_DIR=src/gen/shared/cpp_ext/$WASM_TARGET
mkdir -p $WASM_DST_DIR
cp -f $WASM_SRC_DIR/*.wasm $WASM_DST_DIR
cp -f $WASM_SRC_DIR/*.js $WASM_DST_DIR

echo "Done!"
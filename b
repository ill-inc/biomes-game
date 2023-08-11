#!/usr/bin/env bash

# Find Python binary
PYTHON=`which python3`
if [ -z "$PYTHON" ]; then
    PYTHON=`which python`
fi

$PYTHON ./scripts/b/bootstrap.py "$@"
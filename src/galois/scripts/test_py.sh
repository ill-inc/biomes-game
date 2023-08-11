#!/bin/bash

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

cd $SCRIPTPATH/../py/assets
python -m unittest test.shapes_test
python -m unittest test.succinct_test

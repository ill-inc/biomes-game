#!/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
declare -a BUCKETS=(
    "gs://biomes-social"
    "gs://biomes-static"
)

CORS_FILE="$SCRIPTPATH/cors.json"

for val in "${BUCKETS[@]}"; do
    gsutil cors set $CORS_FILE $val
    gsutil web set -m 404.html -e 404.html $val
done
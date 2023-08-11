#!/bin/bash
set -euo pipefail

# This script will clone the https://github.com/pmndrs/detect-gpu.git library
# and run its script for scraping benchmark data from https://gfxbench.com.
# The specific benchmark used can be adjusted by changing the TEST_NUMBER
# top-level variable. The results are automatically uploaded to GCS and a
# URL to the newly created benchmarking data is created.

# Test number 545 refers to the "1080p Manhattan Offscreen" benchmark.
# We want to use offscreen benchmark data so that results are not limited
# by refresh rate.
TEST_NUMBER=545

# Lock the version of the detect-gpu repo that we use.
DETECT_CPU_COMMIT="87556d09f74f22ad28dd052da688780c99741035"

# If you're testing this script, you can set UPDATE_GPU_WORK_DIR to
# have the results placed in a specified directory that won't be cleaned up
# automatically after the script is run.

# We need google-chrome to be installed since the detect-gpu library uses
# puppeteer (which uses Chrome) to scrape the benchmark data.
if ! which google-chrome > /dev/null; then
    echo "google-chrome not found. Please install it."
    exit 1
fi

# Check if the UPDATE_GPU_WORK_DIR environment variable is set, otherwise
# create a temporary directory.
if [ -z "${UPDATE_GPU_WORK_DIR:-}" ]; then
    # Create a temporary directory to pull the detect-gpu repo.
    WORK_DIR=$(mktemp -d -t update_gpu_benchmarks_XXXXXX)

    function cleanup {
        rm -rf "$WORK_DIR"
        echo "Deleted temp working directory $WORK_DIR"
    }
    trap cleanup EXIT
else
    echo "Using UPDATE_GPU_WORK_DIR: $UPDATE_GPU_WORK_DIR"
    WORK_DIR=$UPDATE_GPU_WORK_DIR
    mkdir -p ${WORK_DIR}
    # If the detect-gpu directory already exists, delete it before continuing.
    if [ -d "${WORK_DIR}/detect-gpu" ]; then
        rm -rf "${WORK_DIR}/detect-gpu"
    fi
fi

cd $WORK_DIR
git clone https://github.com/pmndrs/detect-gpu.git
cd detect-gpu

# Pin to a specific commit so we can explicitly update when desired.
git checkout ${DETECT_CPU_COMMIT}


# Tweak the URL we scrape from to select the specified benchmark.
cat scripts/update_benchmarks.ts | sed -E "s|(const BENCHMARK_URL = .*test=)[0-9]*|\1${TEST_NUMBER}|g" > tempfile.ts
mv tempfile.ts scripts/update_benchmarks.ts

# Prepare to run the script.
yarn install
yarn update-benchmarks

GCS_BASE_PATH=biomes-static/gpu-benchmarks
UPLOAD_DIR=$(date +%Y-%m-%d)_$(openssl rand -hex 4)

GCS_FULL_PATH=${GCS_BASE_PATH}/${UPLOAD_DIR}
GCS_FULL_GSUTIL_URI=gs://${GCS_FULL_PATH}
GCS_FULL_PUBLIC_URL=https://storage.googleapis.com/${GCS_FULL_PATH}

# The results are now sitting in the benchmarks/ folder, upload those to GCS.
gsutil -m cp -r benchmarks/* ${GCS_FULL_GSUTIL_URI}

echo
echo "Success. New benchmark data is available at:"
echo "  Public URL (use this for benchmarksURL): ${GCS_FULL_PUBLIC_URL}"
echo "  gsutil URI: ${GCS_FULL_GSUTIL_URI}"
echo

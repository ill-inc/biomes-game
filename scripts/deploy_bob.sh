#!/bin/bash
set -euo pipefail

SCRIPTPATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
REPO_ROOT="$(cd "$SCRIPTPATH/.." > /dev/null 2>&1 ; pwd -P )"

cd "${REPO_ROOT}"

# Delete the gen dir to ensure it's as clean as possible.
rm -rf src/gen

# Rebuild the generated dependencies.
./b ts-deps build

# Make the sha available to the build...
echo $(git rev-parse HEAD) > BUILD_ID.bob

# Build the Bob docker image and name it locally as "bob".
docker build -f Dockerfile.bob -t bob .

echo "Local Bob image created, and named 'bob'. You can explore the image by running:"
echo "  docker run -it --entrypoint /bin/bash bob"
echo

SHORT_SHA=$(git rev-parse --short HEAD)
IMAGE="us-central1-docker.pkg.dev/zones-cloud/b/bob"
PUSH_TARGET="${IMAGE}:${SHORT_SHA}"

read -n 1 -s -r -p "Press any key to deploy the image to '${PUSH_TARGET}', or ctrl+c to abort.."

docker tag bob ${PUSH_TARGET}
docker push ${PUSH_TARGET}

# Everything seems to have gone alright, tag it with latest.
gcloud artifacts docker tags add "${PUSH_TARGET}" "${IMAGE}:ok-${SHORT_SHA}"
gcloud artifacts docker tags add "${PUSH_TARGET}" "${IMAGE}:latest"


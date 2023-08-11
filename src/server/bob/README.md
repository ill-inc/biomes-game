# Bob

Bob builds our deployment images.

## Deploying Bob

You may need to authenticate your Docker CLI with Google Cloud to perform the
deployment, to do so enter:

```
gcloud auth configure-docker us-central1-docker.pkg.dev
```

and see https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling for more information.

To build and deploy Bob, run the script
[`scripts/deploy_bob.sh`](/scripts/deploy_bob.sh):

```
scripts/deploy_bob.sh
```

Once the new image is deployed and tagged as `latest` (you can see a list of Bob deployments [here in Google Cloud Console](https://console.cloud.google.com/artifacts/docker/zones-cloud/us-central1/b/bob?project=zones-cloud)), then the next Bob server restart will use the new image. So, to Restart Bob, enter the command:

```
kubectl rollout restart deployment bob
```

(See [the Eng Ops](https://www.notion.so/illinc/Ops-ec90e1c6781a4c35acfe3ae273c517ef) Notion page for help with setting up `kubectl`.)

At this point, when Bob restarts it will be using the newly deployed image.

## Running Bob locally

For testing, you can run Bob locally.

First, tweak `server.webpack.config.ts` and in `createWebpackConfig`, change
the `mode` from `production` to `development`, otherwise Webpack will override
your `NODE_ENV` environment variable to `production` when you run a server, and
this can result in notifications being sent to Discord as well as newly
built images being actually deployed to prod, which we do want to avoid.

After that run the following commands from the repo root:

```bash
./b build server

export DO_NOT_WAIT_FOR_GCE=1
export BOB_ALWAYS_BUILD=1

node dist/bob.js --workspace ${HOME}/my_test_workspace
```

If you you wanted to test Bob building a particular commit, then you can also
set the environment variable `BOB_OVERRIDE_BUILD_SHA` before running Bob. For
example,

```bash
export BOB_OVERRIDE_BUILD_SHA="698f5ff4a06ba794d8fe57f1a83ccd97bac2cdee"
```

## Testing in Docker

To test Bob in its image, use the following to build and run it:

```bash
# The src/gen directory must exist before building the Dockerfile.
./b ts-deps build
docker build -f Dockerfile.bob -t bob . && docker run -it --entrypoint /bin/bash bob

# You now have a prompt inside of the Bob docker container.

# See above around `server.webpack.config.ts`, but currently webpack
# "production" builds ignore the environment's NODE_ENV setting, so setting
# this doesn't actually do much, but nevertheless it is a good precaution to
# take.
export NODE_ENV=development

gcloud auth application-default login
```

You'll also need to have GitHub credentials in order to clone the repo.
For that, download and run the GitHub CLI tool to login:

```bash
curl -L https://github.com/cli/cli/releases/download/v2.23.0/gh_2.23.0_linux_amd64.tar.gz | tar -xz --directory ${HOME}
export PATH=${HOME}/gh_2.23.0_linux_amd64/bin:${PATH}
gh auth login -w -p https
```

(and say "yes" to "Authenticate Git with your GitHub credentials?")

You can now follow the instructions for running Bob locally, but now inside
the container.

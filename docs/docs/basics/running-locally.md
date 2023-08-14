---
sidebar_position: 1
---

# Local Setup

## Environment Setup

- Install the Node version manager (https://github.com/nvm-sh/nvm).

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

  # Restart console

  nvm install v20
  nvm use v20
  ```

- Install [yarn](https://yarnpkg.com/)
  ```bash
  npm install -g yarn
  ```
- Install [Git LFS](https://git-lfs.github.com/) before cloning the repo or the binary files will have erroneous contents.
  - On Ubuntu,
    ```bash
    sudo apt-get install git-lfs
    ```
  - On MacOS,
    ```bash
    brew install git-lfs
    ```
- Install [Bazel](https://bazel.build/install)
  ```bash
  npm install -g @bazel/bazelisk
  ```
- Clone repo
  ```bash
  git clone git@github.com:{{ site.ghrepo }}.git
  ```
- Install [Redis 7.0.8](https://redis.io/) (optional: only required if running from a data snapshot)
  ```bash
  curl -s https://download.redis.io/releases/redis-7.0.8.tar.gz | tar xvz -C ${HOME} \
    && make -j`nproc` -C ${HOME}/redis-7.0.8 \
    && sudo make install -C ${HOME}/redis-7.0.8 \
    && rm -rf ${HOME}/redis-7.0.8
  ```

## Running Biomes from a data snapshot

Note that this required Redis to be installed.

- In the Biomes repository directory,
  ```bash
  ./b data-snapshot run
  ```
- Visit `http://localhost:3000`

## Running Biomes from prod

Note that you will not be able to do this without a Global Illumination employee account.

### Environment setup

- Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install-sdk
- Authenticate your @ill.inc user account credentials so you can hit the prod database
  ```bash
  gcloud auth application-default login
  gcloud auth login
  ```
- **FIREBASE REQUIREMENT:** If you will be testing push messaging locally, you need to use a custom `OAuth client id` for Firebase. To get those, follow the instructions here: https://firebase.google.com/docs/admin/setup#testing_with_gcloud_end_user_credentials

### Running

- In the Biomes repository directory,
  ```bash
  ./b web --production-secrets
  ```
- Visit `http://localhost:3000`
- After editing client source files (including CSS) the site will auto-reload. Sometimes this messes up (black screen) and you'll need to force refresh the page

## Coding Environment

- The recommended code editor is [VSCode](https://code.visualstudio.com/).

## Developing inside a container

If you want to jump right in with a ready-to-go dev environment (enabling you to skip all of the "Environment setup" steps above), you can take advantage of VS Code's "Developing inside a Container" feature. See [.devcontainer/README.md](https://github.com/ill-inc/biomes-game/blob/main/.devcontainer/README.md) for instructions on how to set that up.

### GitHub Codespaces

Building off the "Developing inside a container" support, you can also start
up a [GitHub Codespace](https://github.com/features/codespaces) in this repository by [clicking here](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=677467268&skip_quickstart=true). Make sure to choose "16-core" or better for "Machine type".

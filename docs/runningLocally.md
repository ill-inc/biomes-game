---
title: Running Locally
description: Running servers locally
order: 10
---

## Environment Setup

- Install the Node version manager (https://github.com/nvm-sh/nvm).

  ```
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

  # Restart console

  nvm install v20
  nvm use v20
  ```

- Install [yarn](https://yarnpkg.com/)
  ```
  npm install -g yarn
  ```
- Install [Git LFS](https://git-lfs.github.com/) before cloning the repo or the binary files will have erroneous contents.
  - On Ubuntu,
    ```
    sudo apt-get install git-lfs
    ```
  - On MacOS,
    ```
    brew install git-lfs
    ```
- Install [Bazel](https://bazel.build/install)
  ```
  npm install -g @bazel/bazelisk
  ```
- Clone repo
  ```
  git clone git@github.com:{{ site.ghrepo }}.git
  ```

## Running Biomes from a data snapshot

### Environment setup

- Install Redis 7.0.8
  ```
  curl -s https://download.redis.io/releases/redis-7.0.8.tar.gz | tar xvz -C ${HOME} \
    && make -j`nproc` -C ${HOME}/redis-7.0.8 \
    && sudo make install -C ${HOME}/redis-7.0.8 \
    && rm -rf ${HOME}/redis-7.0.8
  ```

### Running

- Run Biomes
  ```
  ./b data-snapshot run
  ```

## Running Biomes from prod

Note that you will not be able to do this without a Global Illumination employee account.

### Environment setup

- Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install-sdk
- Authenticate your @ill.inc user account credentials so you can hit the prod database
  ```
  gcloud auth application-default login
  gcloud auth login
  ```
- **FIREBASE REQUIREMENT:** If you will be testing push messaging locally, you need to use a custom `OAuth client id` for Firebase. To get those, follow the instructions here: https://firebase.google.com/docs/admin/setup#testing_with_gcloud_end_user_credentials

### Running

- In the Biomes repository directory,
  ```
  ./b web --production-secrets
  ```
- Visit `http://localhost:3000`
- After editing client source files (including CSS) the site will auto-reload. Sometimes this messes up (black screen) and you'll need to force refresh the page

## Coding Environment

- The recommended code editor is [VSCode](https://code.visualstudio.com/).

## Developing inside a container

If you want to jump right in with a ready-to-go dev environment, you can take advantage of VS Code's "Developing inside a Container" feature. See [.devcontainer/README.md](https://github.com/{{ site.ghrepo }}/tree/main/.devcontainer/README.md) for instructions on how to set that up.

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

## Coding Environment

- The recommended code editor is [VSCode](https://code.visualstudio.com/).

## Developing inside a container

If you want to jump right in with a ready-to-go dev environment (enabling you to skip all of the "Environment setup" steps above), you can take advantage of VS Code's "Developing inside a Container" feature. See [.devcontainer/README.md](../.devcontainer/README.md) for instructions on how to set that up.

### GitHub Codespaces

Building off the "Developing inside a container" support, you can also start
up a [GitHub Codespace](https://github.com/features/codespaces) in this repository by [clicking here](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=677467268&skip_quickstart=true). Make sure to choose "16-core" or better for "Machine type".

---
sidebar_position: 1
---

# Local Setup

## Environment Setup

Note that this repo supports dev containers so a quick way to setup your environment is to skip this section and [start a codespace](#github-codespaces). Read on for manual instructions.

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
- Install [Python version >=3.9,<=3.10](https://www.python.org/)
- Install [clang version >= 14](https://clang.llvm.org/)
- Install [Bazel](https://bazel.build/install)
  ```bash
  npm install -g @bazel/bazelisk
  ```
- Clone repo
  ```bash
  git clone https://github.com/ill-inc/biomes-game.git
  ```
- Run `git lfs pull` to ensure that the LFS files are up-to-date.
- Setup Python Virtual Environment (optional, but recommended)
  ```bash
  python -m venv .venv
  source .venv/bin/activate
  ```
- Run `pip install -r requirements.txt` to download python requirements.
- Install [Redis 7.0.8](https://redis.io/)
  ```bash
  curl -s https://download.redis.io/releases/redis-7.0.8.tar.gz | tar xvz -C ${HOME} \
    && make -j`nproc` -C ${HOME}/redis-7.0.8 \
    && sudo make install -C ${HOME}/redis-7.0.8 \
    && rm -rf ${HOME}/redis-7.0.8
  ```

## Run Biomes

- In the Biomes repository directory,
  ```bash
  ./b data-snapshot run
  ```
- Visit `http://localhost:3000`.

## Coding Environment

- The recommended code editor is [VSCode](https://code.visualstudio.com/).

## Developing inside a container

If you want to jump right in with a ready-to-go dev environment (enabling you to skip all of the "Environment setup" steps above), you can take advantage of VS Code's "Developing inside a Container" feature. See [.devcontainer/README.md](https://github.com/ill-inc/biomes-game/blob/main/.devcontainer/README.md) for instructions on how to set that up.

### GitHub Codespaces

Building off the "Developing inside a container" support, you can also start
up a [GitHub Codespace](https://github.com/features/codespaces) in this repository by [clicking here](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=677467268&skip_quickstart=true). Make sure to choose "16-core" or better for "Machine type".

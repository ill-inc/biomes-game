---
sidebar_position: 1
---

# Local Setup

## Environment Setup

To run Biomes locally, you'll need to have 64GB of memory.

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
up a [GitHub Codespace](https://github.com/features/codespaces) in this repository by [clicking here](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=677467268&skip_quickstart=true). Make sure to choose "16-core" or better for "Machine type" (which should come with the required 64GB of memory). If you create a codespace, you should always open it in VS Code, _not_ a browser, so that you can access the dev server at `localhost:3000`, which a lot of the system is expecting.

## Common problems and solutions

### Discord error on startup

Disable Discord web hooks by adding:

```
discordHooksEnabled: false
```

to [biomes.config.dev.yaml](https://github.com/ill-inc/biomes-game/blob/main/biomes.config.dev.yaml).

### Error when using social logins (Twitch/Discord/Google)

Social logins will not work if you don't have access to the required API keys. Hence, they will not work for the local build, and should not be used.

### Invalid asset paths

Not found (404) errors of the form "Could not find `<asset-path>/<name>-<hash>.<extension>`" are often caused by having out of date assets, from a previous `./b data-snapshot run`.

To fix this, run:

```bash
./b data-snapshot uninstall
./b data-snapshot pull
```

to fetch the most up to date assets.

# Galois

![galois-ci](https://github.com/ill-inc/biomes/actions/workflows/galois-ci.yml/badge.svg)

Galois is a collection of tools for asset generation. Galois introduces a custom DSL for defining assets (e.g. meshes, textures, game objects, configuration files, maps, worlds), a build system for generating binary asset data, and tools for viewing and editing assets through a UI.

<img src="data/icons/axe.png">&nbsp;
<img src="data/icons/camera.png">&nbsp;
<img src="data/icons/oak-trunk.png">&nbsp;
<img src="data/icons/pickaxe.png">&nbsp;
<img src="data/icons/stone.png">&nbsp;
<img src="data/icons/wand.png">&nbsp;
<img src="data/icons/wood-chest.png">

## Setup

Galois is a combination of TypeScript, Python and C++. The TypeScript lives in
the `src/galois/js` directory and runs in the same yarn environment as the
host biomes. The C++ is coming from the dependency on [voxeloo](/voxeloo), and
is accessed only by the Python, and therefore Voxeloo must be installed as part
of the Python dependencies. The Galois Python code is in `src/galois/py`, and
is unique to Galois, requiring its own environment setup, described next.

### Install Python dependencies

Issue all the following commands from the Biomes root directory.

In order for the python asset generation code to run, you'll need to ensure
its dependencies are installed. First, to keep your Python dependencies
isolated we recommend you setup a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

Then, you can install all dependencies with:

```bash
pip install -r requirements.txt
```

You will additionally need to compile [voxeloo](/voxeloo) and make it visible
to your Python environment for importing:

```bash
pip install ./voxeloo
```

### WSL

You will need to install some packages in order to open the electron
applications from within WSL:

```bash
sudo apt install libnss3 libatk-bridge2.0-0 libcups2 libgbm-dev libgtk-3-0
```

If you get the following error when opening the electron app

```
/home/tanson/biomes/node_modules/electron/dist/electron exited with signal SIGTRAP
error Command failed with exit code 1.
```

that means wsl can't access a gui to render the app. Follow the instructions here [https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps) to install x11. Namely this line

```bash
sudo apt install x11-apps -y
```

Restart wsl then try again.

## Dev Workflows

The yarn environment is the same as the biomes host repository, so make sure
you're up-to-date there by running `yarn install`.

The basic workflows are:

#### Publish assets to biomes

1. run: `./b galois assets publish`

This will regenerate art assets and save them to the `/public` directory of
biomes.

#### Run all Galois tests

1. run: `./b galois test`

#### Run the editor tool

1. run: `./b galois editor start`
2. Additionally, if you'd like your code changes to be live after a CTRL+R
   refresh of the editor, you should run `./b galois editor watch` in another
   terminal and leave that running.

#### Run the viewer tool

1. run: `./b galois viewer start`
2. optionally, also run `./b galois viewer watch`

## Working with assets

#### Run all node.js packages

#### Adding new defintions to the asset DSL

1. edit: `py/assets/defs.py`
2. run: `scripts/gen_all.sh`

#### Define a new asset using the TypeScript API

1. edit: `js/assets/src/{category}.ts`
2. dump: `./b galois assets dump -n <name_of_asset>` (from `js/`)

#### Add implementation for a new asset DSL definition:

1. add materialization: `py/assets/impl/materialization.py`
2. add serialization: `py/assets/impl/serialization.py` (optional)

#### Add React code to visualize new asset

1. edit: `js/viewer/src/view/content.tsx`
2. test: `./b galois viewer start` (from `js/`)

#### Hot reloading

1. run: `./b galois [(editor)|(viewer)] watch`
2. The above command will push view changes to a running electron app.

#### Package

This compiles our python into a single `.exe` and then wraps an electron `.exe` around it.
Make sure to first configure your virtualenv.

1. run: `./b galois [(editor)|(viewer)] package` for packaging the editor or
   viewer (though we only currently have a use case for packaging the editor).
2. The package will appear in the subdirectory inside `galois_package/`

## Shaders

Make sure to install the extension `raczzalan.webgl-glsl-editor`, which provides really good syntax highlighting and inline errors for
GLSL vertex and fragment shaders. The shaders are listed under the root `shaders/` directory. There is a code-generation step triggered
by running `scripts/gen_all.sh` that builds TypeScript bindings for all shaders listed in the `shaders/all.json` directory.

#### Adding new shaders and exposing to TypeScript API

1. edit: `shaders/`
2. run: `scripts/gen_all.sh`

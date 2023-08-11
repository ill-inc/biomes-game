#!/usr/bin/env python

"""Builds TypeScript API for the asset query language.

Usage:
  gen_ts.py --output=<output>
  gen_ts.py (-h | --help)

Options:
  -h --help         Show this screen.
  --output=<output> Directory at which output is generated.

"""
import ast
import os
import subprocess
import sys

sys.path.append(os.path.dirname(__file__))
import lang
from defs import (
    affine_transforms,
    audio,
    color_palettes,
    files,
    general,
    groups,
    item_meshes,
    items,
    mapping,
    placeable_groups,
    shapers,
    terrain,
    textures,
    voxels,
    water,
    wearables,
)
from docopt import docopt
from jinja2 import Environment, FileSystemLoader
from xtermcolor import colorize


def gen_types():
    g = lang.TypeGenerator()
    affine_transforms.define_types(g)
    audio.define_types(g)
    color_palettes.define_types(g)
    placeable_groups.define_types(g)
    files.define_types(g)
    general.define_types(g)
    groups.define_types(g)
    mapping.define_types(g)
    item_meshes.define_types(g)
    items.define_types(g)
    shapers.define_types(g)
    terrain.define_types(g)
    textures.define_types(g)
    voxels.define_types(g)
    water.define_types(g)
    wearables.define_types(g)
    return g.build()


def gen_funcs(types):
    g = lang.FuncGenerator(types)
    affine_transforms.define_funcs(g)
    audio.define_funcs(g)
    color_palettes.define_funcs(g)
    placeable_groups.define_funcs(g)
    files.define_funcs(g)
    general.define_funcs(g)
    groups.define_funcs(g)
    item_meshes.define_funcs(g)
    items.define_funcs(g)
    mapping.define_funcs(g)
    shapers.define_funcs(g)
    terrain.define_funcs(g)
    textures.define_funcs(g)
    voxels.define_funcs(g)
    water.define_funcs(g)
    wearables.define_funcs(g)
    return g.build()


def check_implementation(types, funcs):
    kinds = set()
    kinds |= {
        t.kind
        for t in types
        if t.kind not in ["External", "Union", "Reference"]
    }
    kinds |= {f.signature() for overloads in funcs for f in overloads.funcs}

    # Populate the implementation map with
    class NodeMapVisitor(ast.NodeVisitor):
        def __init__(self):
            self.binds = None

        def visit_Assign(self, node):
            if (
                len(node.targets) == 1
                and hasattr(node.targets[0], "id")
                and node.targets[0].id == "MATERIALIZATION_MAP"
            ):
                self.binds = {x.value for x in node.value.keys}
            else:
                self.generic_visit(node)

    visitor = NodeMapVisitor()
    with open(script_relative("impl/materializers.py")) as f:
        visitor.visit(ast.parse(f.read()))

    success = True
    for kind in sorted(kinds - visitor.binds):
        err = f"{colorize('Missing implementation for', ansi=196)}: {colorize(kind, ansi=80)}"
        subprocess.run(["echo", "-e", err])
        success = False

    for kind in sorted(visitor.binds - kinds):
        err = f"{colorize('Superfluous implementation for', ansi=196)}: {colorize(kind, ansi=80)}"
        subprocess.run(["echo", "-e", err])
        success = False

    return success


def script_relative(path):
    return os.path.abspath(
        f"{os.path.dirname(os.path.abspath(__file__))}/{path}"
    )


def gen_ts(path):
    types = gen_types()
    funcs = gen_funcs(types)

    # Create the Jinja environment
    env = Environment(
        loader=FileSystemLoader(script_relative("templates")),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    def render_template(template, out):
        tmpl = env.get_template(template)
        tmpl_out = tmpl.render(types=types, funcs=funcs)

        with open(out, "w") as f:
            f.write(tmpl_out)
        print(f"Generated '{out}'")

    # Render the templates.
    render_template("types.ts.j2", f"{path}/types.ts")
    render_template("routines.ts.j2", f"{path}/routines.ts")

    # Print some helpful information about missing implementation.
    return check_implementation(types, funcs)


def main():
    args = docopt(__doc__, version="TypeScript Asset API generator")
    success = gen_ts(path=args["--output"])
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()

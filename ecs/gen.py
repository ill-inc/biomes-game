#!/usr/bin/env python

import defs
from ecs_ast import Generator, TypeGenerator
from ts import gen_ts


def gen_types(ast_config):
    g = TypeGenerator(ast_config)
    defs.define_types(g)
    return g.build()


def gen_defs(ast_config, types):
    g = Generator(ast_config, types)
    defs.define_components(g)
    defs.define_entities(g)
    defs.define_events(g)
    defs.define_selectors(g)
    return g.defs


def main(ids_path="ecs/ecs.ids.json", path="src/shared/ecs/gen"):
    gen_ts(gen_types, gen_defs, path)


if __name__ == "__main__":
    main()

"""Builds assets from an abstract representation.

Usage:
  build.py asset [--workspace=<dir>] [--errors] [--incremental] [--print_timers] [--ignore_sigint]
  build.py batch [--workspace=<dir>] [--errors] [--incremental] [--print_timers] [--ignore_sigint]
  build.py (-h | --help)

Options:
  -h --help                 Show this screen.
  --workspace=<dir>         Base directory to look for source files (e.g. art)
  --errors                  Errors will propagate if set
  --incremental             Will omit building unchanged assets.
  --source_asset_dir=<dir>  The directory to find all source art assets in.
  --print_timers            Prints profile timing information to stderr.
  --ignore_sigint           Ignores the SIGINT signal ()
"""
import json
import os
import signal
import sys
from base64 import b64encode

import impl
from docopt import docopt
from impl.incremental import QueryIndex
from impl.lru_cache_by_hash import LRUCacheByHash
from impl.materializers import materialize
from impl.repo import init_workspace_dir, pop_file_log
from impl.stats import Timer, TimerMap


def make_literal(stmt):
    return impl.LiteralNode(kind=stmt["kind"], data=stmt["data"])


def make_derived(vals, nodes, stmt):
    return impl.DerivedNode(
        kind=stmt["kind"],
        deps=[vals[i] for i in stmt["deps"]],
        dep_hashes=[nodes[i].hash for i in stmt["deps"]],
    )


g_materialized_cache = LRUCacheByHash(
    500  # Cache capacity in number of objects.
)


def log(*args, **kwargs):
    print(*args, **kwargs, file=sys.stderr)


def exec_program(code: str, errors: bool, timers: TimerMap) -> str:
    program = json.loads(code)
    try:
        vals = []
        nodes = []
        for stmt in program:
            node = {
                "literal": lambda: make_literal(stmt),
                "derived": lambda: make_derived(vals, nodes, stmt),
            }[stmt["node"]]()
            with Timer(stmt["kind"], timers):
                vals.append(
                    g_materialized_cache.set_default(
                        node.hash, lambda: materialize(node)
                    )
                )
                nodes.append(node)

        return impl.serialize(vals[-1])
    except Exception as e:
        if not errors:
            return impl.serialize(e)
        raise


def set_workspace_dir(args):
    workspace_dir_arg = args["--workspace"]
    if not workspace_dir_arg:
        workspace_dir_arg = os.getcwd()
    init_workspace_dir(workspace_dir_arg)


def build_asset(args):
    errors = args["--errors"] or False
    print_timers = args["--print_timers"] or False
    incremental = args["--incremental"] or False

    timers = TimerMap()

    # Read in an execute the asset program.
    with QueryIndex() as index:
        code = sys.stdin.read()
        if incremental and index.unchanged(code):
            result = json.dumps({"kind": "Signal", "info": "unchanged"})
        else:
            result = exec_program(code, errors, timers)
            index.update(code, list(pop_file_log()))

    # Print out the results.
    if print_timers:
        log(str(timers))
    print(result)


def build_batch(args):
    errors = args["--errors"] or False
    print_timers = args["--print_timers"] or False
    incremental = args["--incremental"] or False

    timers = TimerMap()

    infile = os.fdopen(3, "r")
    outfile = os.fdopen(4, "w")

    def write_result(result: str):
        print(
            b64encode(result.encode("utf-8")),
            end="\n",
            flush=True,
            file=outfile,
        )

    with QueryIndex() as index:
        while True:
            header = infile.readline().rstrip()
            if len(header) == 0:
                break
            length = int(header)
            if length > 0:
                # TODO: Fix the need for base64 here. The only reason we do this
                # right now is because the node APIs make blocking reads hard.
                code = infile.read(length)
                if incremental and index.unchanged(code):
                    write_result(
                        json.dumps({"kind": "Signal", "info": "unchanged"})
                    )
                else:
                    write_result(exec_program(code, errors, timers))
                    index.update(code, list(pop_file_log()))

    # Print performance diagnostics.
    if print_timers:
        log(str(timers))
        log(g_materialized_cache.cache_info())


if __name__ == "__main__":
    args = docopt(__doc__, version="Asset Builder v1.0")

    if args["--ignore_sigint"]:
        signal.signal(signal.SIGINT, signal.SIG_IGN)

    set_workspace_dir(args)

    # Run in the specified mode.
    if args["asset"]:
        build_asset(args)
    elif args["batch"]:
        build_batch(args)

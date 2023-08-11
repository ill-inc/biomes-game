import http
import http.server
import json
import math
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from curses import ERR
from dataclasses import dataclass, field
from datetime import datetime
from functools import update_wrapper
from pathlib import Path
from queue import SimpleQueue
from threading import Thread
from typing import (
    IO,
    Any,
    Callable,
    Dict,
    Iterable,
    List,
    Literal,
    Optional,
    Protocol,
    Set,
    Union,
)

import click
import psutil
import requests
from click_default_group import DefaultGroup
from dotenv import load_dotenv
from ts_deps import (
    TsDep,
    ensure_ts_deps_up_to_date,
    run_bazel,
    run_with_hidden_output,
    watch_ts_deps,
)

from data_snapshot import data_snapshot as data_snapshot_commands
from galois import galois as galois_commands

ERROR_COLOR = "bright_red"
WARNING_COLOR = "bright_yellow"
GOOD_COLOR = "bright_green"

AssetMode = Union[
    Literal["none"], Literal["lazy"], Literal["local"], Literal["proxy"]
]
BootstrapMethod = Union[Literal["sync"], Literal["empty"]]
FirehoseMode = Union[Literal["memory"], Literal["shim"], Literal["redis"]]
BiscuitsMode = Union[Literal["memory"], Literal["shim"], Literal["redis"]]
StorageMode = Union[Literal["copy-on-write"], Literal["memory"]]


class DesireQuitException(Exception):
    pass


@dataclass
class GameConfig:
    assets: AssetMode = "proxy"
    bootstrap: BootstrapMethod = "sync"
    extra_config_overrides: dict = field(default_factory=dict)
    extra_node_args: Optional[List[str]] = None
    firehose: FirehoseMode = "shim"
    biscuits: BiscuitsMode = "shim"
    home_override: bool = True
    keep_players: bool = False
    login_as: int = 0
    production_secrets: bool = False
    dev_auth: bool = True
    radius: int = 0
    position: str = ""
    reset_players: bool = False
    storage: StorageMode = "copy-on-write"
    additional_args: List[str] = field(default_factory=list)
    ram: Optional[int] = None
    web_ram: Optional[int] = None
    open_admin_access: bool = False
    bikkie_static_prefix: Optional[str] = None
    galois_static_prefix: Optional[str] = None
    local_gcs: bool = False

def create_args(config: GameConfig, ext: Dict[str, str] = {}):
    base = {
        "--biscuitMode": config.biscuits,
        "--storageMode": "shim",
        "--firehoseMode": config.firehose,
    }
    base.update(ext)
    return base


def biomes_config_override(config: GameConfig):
    overrides = {}
    if config.reset_players:
        overrides["devResetAllPlayers"] = True
    if config.keep_players:
        # Can't specified undefined in JSON, so bump it to a year
        overrides["gamePlayerExpirationSecs"] = 365 * 24 * 60 * 60
    if config.position:
        overrides["devBootstrapPosition"] = config.position
    if config.radius:
        overrides["devBootstrapRadius"] = config.radius
    if config.home_override:
        overrides["devHomeOverride"] = "centerOfTerrain"
    for k, v in config.extra_config_overrides.items():
        overrides[k] = v
    return json.dumps(overrides)


@dataclass
class ServerSpec:
    """Description of a server and its dependencies."""

    color: str
    name: str
    port: int
    args: Callable[[GameConfig], Dict[str, str]] = create_args
    deps: List["ServerSpec"] = field(default_factory=list)
    implies: List["ServerSpec"] = field(default_factory=list)
    can_use: List["ServerSpec"] = field(default_factory=list)
    entrypoint: Optional[str] = None
    warmup: Optional[Callable[[], Any]] = None
    auto_restart: bool = False
    wait_for_ready: bool = False
    disable_sigint: bool = False
    http: bool = False

    @property
    def ports(self):
        # [primary, metrics, rpc]
        return {
            "primary": self.port,
            "metrics": self.port + 1,
            "rpc": self.port + 2,
        }

    def choose_ram(self, config: GameConfig):
        if self.name == "web":
            ram = int(
                config.web_ram
                or os.environ.get("B_WEB_RAM")
                or config.ram
                or os.environ.get("B_RAM")
                or 6000
            )
        else:
            ram = int(config.ram or os.environ.get("B_RAM") or 0)
        if ram:
            return ram
        return None  # Whatever NodeJS default is.


def active_pid(name: str):
    # Read .{name}.pid for the process ID
    try:
        with open(f".b/{name}.pid", "r") as f:
            pid = int(f.readline().strip())
    except:
        # No pid recorded
        return 0
    if not psutil.pid_exists(pid):
        return 0
    try:
        if "node" not in psutil.Process(pid).exe():
            return 0
    except psutil.ZombieProcess:
        return 0
    return pid


def save_active_pid(name: str, pid: int):
    try:
        os.mkdir(".b")
    except FileExistsError:
        pass
    with open(f".b/{name}.pid", "w") as f:
        f.writelines([str(pid)])


def run_thread(target: Callable[[], Any], daemon: bool = False):
    thread = Thread(target=target, daemon=daemon)
    thread.start()
    return thread


def print_banner(message: str, color):
    click.secho(
        "================================================================================\n\n"
        + f"  {message}\n\n"
        + "================================================================================",
        fg=color,
    )


def wait_or_die(process):
    result = process.wait()
    if result != 0:
        sys.exit(result)
    return result


def default_node_options():
    COMMON_NODE_OPTIONS = "--openssl-legacy-provider"

    existing_node_options = os.environ.get("NODE_OPTIONS", "")
    return f"{existing_node_options} {COMMON_NODE_OPTIONS}"


def run_yarn_env(
    args, node_options=[], env={}, use_common_node_options=True, **kwargs
):
    node_options = (
        default_node_options() + " " if use_common_node_options else ""
    ) + " ".join(node_options)
    system_env = os.environ
    node_modules_dir = "node_modules/.bin"
    path = system_env["PATH"] if "PATH" in system_env else node_modules_dir
    system_env["PATH"] = f"{node_modules_dir}:{path}"
    return wait_or_die(
        subprocess.Popen(
            args,
            close_fds=True,
            env={
                **system_env,
                **{
                    "NODE_OPTIONS": node_options,
                },
                **env,
            },
            **kwargs,
        )
    )


additional_node_env = {}


def run_node(
    entrypoint: str,
    args: Optional[List[str]] = None,
    extra_node_args: Optional[List[str]] = None,
    extra_env: Dict[str, str] = {},
    ram: Optional[int] = None,
    **kwargs,
):
    nodeEnvOptions = default_node_options()
    if ram is not None:
        nodeEnvOptions += f" --max_old_space_size={ram}"

    return subprocess.Popen(
        [
            "node",
            "-r",
            "ts-node/register",
            "--trace-warnings",
        ]
        + (extra_node_args or [])
        + [
            entrypoint,
        ]
        + (args or []),
        close_fds=True,
        env={
            **os.environ,
            **{
                # Force some log options
                "LOG_TIME": "0",
                "FORCE_COLOR": "3",
                # Node required options
                "NODE_OPTIONS": nodeEnvOptions,
                "GOOGLE_CLOUD_PROJECT": "zones-cloud",
                "IS_SERVER": "true",
            },
            **additional_node_env,
            **extra_env,
        },
        **kwargs,
    )


class LogSinkSpecP(Protocol):
    """The interface for objects consumed by LogSink."""

    color: str
    name: str


@dataclass
class LogSinkSpec:
    """Description of a log sink source."""

    color: str
    name: str


def color_name(spec: LogSinkSpecP):
    return click.style(spec.name, fg=spec.color)


class LogSink:
    log_files: Dict[str, IO] = {}
    server_names: Dict[str, str] = {}
    q = SimpleQueue()

    def __init__(self, specs: List[LogSinkSpecP]):
        max_name_length = max(len(s.name) for s in specs)
        for spec in specs:
            self.server_names[spec.name] = (
                " " * (max_name_length - len(spec.name))
            ) + color_name(spec).rjust(10)

    def log(self, name: str, line: str):
        self.q.put((name, line))

    def halt(self):
        self.q.put(("", ""))

    def run_drain(self):
        while True:
            (name, line) = self.q.get()
            if not name:
                break
            self.flush(name, line)
        for log_file in self.log_files.values():
            log_file.close()
        self.log_files = {}

    def flush(self, name, line):
        log_file = self.log_files.get(name)
        if log_file is None:
            log_file = open(f".b/{name}.log", "w")
            self.log_files[name] = log_file

        now = datetime.now()
        time = click.style(now.strftime("%H:%M:%S"), fg="bright_black")
        sys.stdout.write(f"[{self.server_names.get(name, name)}] {time} {line}")
        sys.stdout.flush()
        log_file.write(
            f"{now.strftime('%d-%m-%YT%H:%M:%S')} {escape_ansi(line)}"
        )
        log_file.flush()


def tail_io(name: str, io: IO, sink: LogSink):
    while not io.closed:
        try:
            line = io.readline().decode("utf-8")
            if line:
                sink.log(name, line)
            else:
                break
        except:
            break


def request_fetch(
    port: int, path: str = "", *, session: Optional[requests.Session] = None
):
    """Make a warmup request to the given server port."""
    try:
        result = (session or requests).get(
            f"http://127.0.0.1:{port}{path}", stream=False
        )
        return result.status_code == 200
    except:
        return False


DO_NOT_PROXY = ["_next/static/development", "Manifest.js"]


class StaticHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, sink: LogSink, *args, **kwargs):
        self.sink = sink
        super().__init__(*args, directory="public", **kwargs)

    def translate_path(self, path):
        path = super().translate_path(path)
        return path.replace("public/_next", ".next")

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        return super().end_headers()

    def proxy_to_web(self, body: bool):
        sent = False
        try:
            resp = requests.get(
                f"http://localhost:3000{self.path}",
                headers={k: v for k, v in self.headers.items()},
                verify=False,
            )
            sent = True

            self.send_response(resp.status_code)
            for k, v in resp.headers.items():
                self.send_header(k, v)
            self.end_headers()
            if body:
                self.wfile.write(resp.content)
        finally:
            if not sent:
                self.send_error(404, "error trying to proxy")

    def should_proxy(self):
        for path in DO_NOT_PROXY:
            if path in self.path:
                return True
        return False

    def do_HEAD(self):
        if self.should_proxy():
            self.proxy_to_web(False)
            return
        super().do_HEAD()

    def do_GET(self):
        if self.should_proxy():
            self.proxy_to_web(True)
            return
        try:
            super().do_GET()
        except:
            # Ignore errors.
            pass

    def log_request(self, code="-", size="-"):
        if "/_next/webpack-hmr" in self.path or self.should_proxy():
            # Ignore HMR requests.
            return
        if isinstance(code, http.HTTPStatus):
            code = code.value
        self.sink.log("static", f"{self.requestline} {code} {size}\n")

    def log_error(self, format, *args):
        pass

    def log_message(self, format, *args):
        pass


class StaticServer(http.server.ThreadingHTTPServer):
    def __init__(self, spec: ServerSpec, sink: LogSink):
        super().__init__(("", spec.port), StaticHandler)
        self.spec = spec
        self.sink = sink

    def wait_for(self):
        pass

    def finish_request(self, request, client_address):
        StaticHandler(self.sink, request, client_address, self)

    def run(self):
        run_thread(self.run_thread, daemon=True)

    def run_thread(self):
        with self as httpd:
            httpd.serve_forever()


class RunProcess(Protocol):
    def run(self):
        pass

    def kill(self):
        pass

    def wait_for_close(self):
        pass


class BazelWatchProcess:
    process: Optional[subprocess.Popen] = None
    child_threads: List[Thread] = []

    def __init__(self, sink: LogSink, build_config: str, disable_sigint=False):
        self.sink = sink
        self.disable_sigint = disable_sigint
        self.build_config = build_config

    def run(self):
        # Run it as a separate process so that all of its io can be wrapped
        # nicely.
        self.process = subprocess.Popen(
            [
                sys.executable,
                "-c",
                f'import ts_deps; ts_deps.watch_ts_deps("{self.build_config}", disable_sigint={self.disable_sigint})',
            ],
            close_fds=True,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=Path("scripts") / "b",
        )
        save_active_pid(BAZEL.name, self.process.pid)

        self.child_threads.append(run_thread(self.watch_logs))

    def watch_logs(self):
        if self.process is None or self.process.stdout is None:
            return
        tail_io(BAZEL.name, self.process.stdout, self.sink)

    def kill(self):
        if self.process is not None:
            self.process.kill()

    def wait_for_close(self):
        if self.process is not None:
            self.process.wait()
        for thread in self.child_threads:
            thread.join()


class Server:
    """Running single server."""

    process: Optional[subprocess.Popen] = None
    is_alive: bool = False
    is_ready: bool = False
    killed: bool = False
    restart_kill: bool = False
    child_threads: List[Thread] = []

    def __init__(
        self,
        config: GameConfig,
        spec: ServerSpec,
        sink: LogSink,
    ):
        self.config = config
        self.spec = spec
        self.sink = sink
        self.session = requests.Session()

    def wait_for_close(self):
        if self.process is not None:
            self.process.wait()
        for thread in self.child_threads:
            thread.join()

    def kill(self):
        self.killed = True
        if self.process is not None:
            self.process.kill()
        self.process = None

    def reboot(self):
        self.killed = True
        self.restart_kill = True
        self.kill()
        self.start_up()

    def run(self):
        if self.process is not None:
            return
        extra_env = {
            **{
                # Ports for this server
                "WEB_PORT": str(self.spec.port),
                "METRICS_PORT": str(self.spec.port + 1),
                "RPC_PORT": str(self.spec.port + 2),
                # Override the JSON config
                "BIOMES_CONFIG_OVERIDE": biomes_config_override(self.config),
            },
            # Ports for dependencies
            **{
                f"{dep.name.upper()}_PORT": str(
                    dep.port + (2 if not dep.http else 0)
                )
                for dep in self.spec.deps
                + self.spec.implies
                + self.spec.can_use
            },
        }
        if self.config.production_secrets:
            extra_env["USE_PRODUCTION_SECRETS"] = "1"
        if self.config.login_as:
            extra_env["BIOMES_OVERRIDE_AUTH"] = str(self.config.login_as)
        if self.config.dev_auth:
            extra_env["BIOMES_DEV_AUTH"] = "1"
        if self.config.open_admin_access:
            extra_env["OPEN_ADMIN_ACCESS"] = "1"
        if self.config.bikkie_static_prefix:
            extra_env["BIKKIE_STATIC_PREFIX"] = self.config.bikkie_static_prefix
        if self.config.galois_static_prefix:
            extra_env["GALOIS_STATIC_PREFIX"] = self.config.galois_static_prefix
        if self.config.local_gcs:
            extra_env["LOCAL_GCS"] = "1"
        if self.spec.disable_sigint:
            extra_env["DISABLE_SIGINT"] = "1"

        self.process = run_node(
            f"src/server/{self.spec.entrypoint or self.spec.name}/main.ts",
            [x for e in self.spec.args(self.config).items() for x in e]
            + list(self.config.additional_args),
            extra_node_args=self.config.extra_node_args,
            extra_env=extra_env,
            ram=self.spec.choose_ram(self.config),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        save_active_pid(self.spec.name, self.process.pid)
        self.child_threads.append(run_thread(self.watch_health))
        self.child_threads.append(run_thread(self.watch_logs))

    def watch_health(self):
        if self.process is None:
            return
        process = self.process
        click.secho(f"Watching: {color_name(self.spec)}:", fg=WARNING_COLOR)
        while process.poll() is None:
            self.is_alive = request_fetch(
                self.spec.port + 1, "/alive", session=self.session
            )
            self.is_ready = request_fetch(
                self.spec.port + 1, "/ready", session=self.session
            )
            time.sleep(1)
        click.secho(
            f"Terminated: {color_name(self.spec)}, exit code {process.returncode}",
            fg=WARNING_COLOR,
        )
        if process.stdout is not None:
            process.stdout.close()
        self.is_alive = False
        self.is_ready = False
        if process.returncode == -9:
            # SIGKILL
            self.killed = True
        elif process.returncode == -15:
            # SIGTERM
            self.killed = True
        if self.restart_kill or (self.spec.auto_restart and not self.killed):
            print_banner(
                f"{color_name(self.spec)} auto-restarting...",
                WARNING_COLOR,
            )
            self.start_up()

    def start_up(self):
        self.process = None
        self.restart_kill = False
        self.killed = False
        self.run()
        self.wait_for()

    def watch_logs(self):
        if self.process is None or self.process.stdout is None:
            return
        tail_io(self.spec.name, self.process.stdout, self.sink)

    def wait_for(self):
        if self.process is None:
            return
        ok = False
        started_waiting = time.time()
        last_notified = time.time()
        while not ok:
            now = time.time()
            if now - last_notified > 6:
                if now - started_waiting > 30:
                    waited_for = math.floor(now - started_waiting)
                    click.secho(
                        f"STILL waiting to be ready: {color_name(self.spec)} ({ waited_for } seconds elapsed)...",
                        fg=ERROR_COLOR,
                    )
                else:
                    click.secho(
                        f"Waiting to be ready: {color_name(self.spec)}...",
                        fg=WARNING_COLOR,
                    )
                last_notified = now
            ok = self.is_alive and (
                self.is_ready or not self.spec.wait_for_ready
            )
        if self.spec.warmup is not None:
            self.spec.warmup()
        click.secho(f"Ready: {color_name(self.spec)}", fg=GOOD_COLOR)


ANSI_ESCAPE_RE = re.compile(r"(\x9B|\x1B\[)[0-?]*[ -\/]*[@-~]")


def escape_ansi(line):
    return ANSI_ESCAPE_RE.sub("", line)


#
# Define all servers and their dependencies.
#

next_port = 3000
# How many ports from the original to keep free for services
PORT_RANGE = 5
# Amount of ports between services
PORT_STEP = 100
# Ports used in certain circumstances to skip
SKIP_PORTS = [
    5000,  # AirPlay on OSX
]


def choose_port():
    global next_port
    next_port += PORT_STEP
    for port in range(next_port, next_port + PORT_RANGE):
        if port in SKIP_PORTS:
            return choose_port()
    return next_port


# Shim server needs not be listed as a dependency, is controlled by the
# storage flag, if any server in closure needs it- it can be run.
SHIM = ServerSpec(
    color="magenta",
    name="shim",
    args=lambda config: create_args(
        # Support storage as well as firehose.
        config,
        {
            "--storageMode": config.storage,
            "--firehoseMode": "memory",
            "--biscuitMode": "memory",
            "--bootstrapMode": config.bootstrap,
        },
    ),
    port=choose_port(),
    wait_for_ready=True,
)

# Microservices
BACKUP = ServerSpec(
    color="bright_magenta",
    name="backup",
    port=choose_port(),
    deps=[SHIM],
    wait_for_ready=True,
)
BALANCER = ServerSpec(
    color="red",
    name="balancer",
    port=choose_port(),
    deps=[SHIM],
)
BIKKIE = ServerSpec(
    color="yellow",
    name="bikkie",
    port=choose_port(),
    deps=[SHIM],
)
LOGIC = ServerSpec(
    color="red",
    name="logic",
    port=choose_port(),
    deps=[SHIM],
    wait_for_ready=True,
)
CHAT = ServerSpec(
    color="bright_yellow",
    name="chat",
    port=choose_port(),
    deps=[SHIM],
    wait_for_ready=True,
)
MAP = ServerSpec(
    color="yellow",
    name="map",
    port=choose_port(),
    deps=[SHIM],
)
NEWTON = ServerSpec(
    color="bright_red",
    name="newton",
    port=choose_port(),
    deps=[SHIM],
)
GAIA = ServerSpec(
    color="green",
    name="gaia",
    entrypoint="gaia_v2",
    can_use=[BALANCER],
    port=choose_port(),
    deps=[SHIM, LOGIC],
)
TRIGGER = ServerSpec(
    color="green",
    name="trigger",
    port=choose_port(),
    deps=[SHIM, LOGIC],
)
NOTIFY = ServerSpec(
    color="bright_blue",
    name="notify",
    port=choose_port(),
    deps=[SHIM],
)
SPAWN = ServerSpec(
    color="bright_blue",
    name="spawn",
    port=choose_port(),
    deps=[SHIM],
    implies=[TRIGGER],
)
ANIMA = ServerSpec(
    color="bright_red",
    name="anima",
    port=choose_port(),
    deps=[SHIM, LOGIC],
    can_use=[BALANCER],
    implies=[SPAWN],
)
ANIMA2 = ServerSpec(
    color="bright_red",
    name="anima2",
    entrypoint="anima",
    port=choose_port(),
    deps=[SHIM, LOGIC],
    can_use=[BALANCER],
    implies=[SPAWN],
)
TASK = ServerSpec(
    color="red",
    name="task",
    port=choose_port(),
    deps=[SHIM, LOGIC],
)
SIDEFX = ServerSpec(
    # A fairly distinct previously unused color.
    color="blue",
    name="sidefx",
    port=choose_port(),
    deps=[SHIM, LOGIC],
)
OOB = ServerSpec(
    color="bright_blue",
    name="oob",
    port=choose_port(),
    deps=[SHIM],
    entrypoint="oob",
    http=True,
)
CAMERA = ServerSpec(
    color="red",
    name="camera",
    port=choose_port(),
    deps=[SHIM],
)
# Main combined entry point
SYNC = ServerSpec(
    color="bright_blue",
    name="sync",
    port=choose_port(),
    deps=[SHIM, LOGIC],
    entrypoint="sync",
    wait_for_ready=True,
    http=True,
)

STATIC = ServerSpec(color="black", name="static", port=3020)

WEB = ServerSpec(
    color="bright_cyan",
    name="web",
    port=3000,
    deps=[SHIM, LOGIC],
    implies=[OOB, SYNC, SIDEFX, BIKKIE],
    can_use=[CAMERA, SYNC],
    entrypoint="web",
    warmup=lambda: request_fetch(3000),
    args=lambda config: create_args(
        config, {"--assetServerMode": config.assets}
    ),
    auto_restart=True,
    wait_for_ready=True,
    http=True,
)

GIZMO = ServerSpec(
    color="yellow", name="gizmo", port=choose_port(), deps=[WEB, SHIM, SYNC]
)

BAZEL = LogSinkSpec(color="white", name="bazel")

ALL_SERVERS = {
    s.name: s
    for s in [
        ANIMA,
        ANIMA2,
        BACKUP,
        BALANCER,
        BIKKIE,
        CAMERA,
        CHAT,
        GAIA,
        GIZMO,
        LOGIC,
        MAP,
        NEWTON,
        NOTIFY,
        OOB,
        SHIM,
        SIDEFX,
        SPAWN,
        STATIC,
        SYNC,
        TASK,
        TRIGGER,
        WEB,
    ]
}


TARGET_ALIASES = {
    "dev": [
        "logic",
        "chat",
        "map",
        "gaia_v2",
        "web",
        "trigger",
        "task",
    ],
    "all": list(ALL_SERVERS.keys()),
}


def expand_targets(targets: Iterable[str]):
    targets = list(targets)
    output: List[str] = []
    while targets:
        target = targets.pop()
        aliased = TARGET_ALIASES.get(target)
        if aliased is not None:
            output.extend(aliased)
        else:
            output.append(target)
    return list(set(output))


# Given a set of target servers, determine the closure of dependencies.
def determine_servers(targets: Iterable[str], include_closure: bool):
    """Determine the closure of the given targets."""
    targets = expand_targets(targets)
    closure: List[ServerSpec] = []
    included = set()
    while targets:
        target = targets.pop()
        if target in included:
            continue
        included.add(target)
        if target not in ALL_SERVERS:
            raise ValueError(f"Unknown target: {target}")
        closure.append(ALL_SERVERS[target])
        if include_closure:
            for dep in ALL_SERVERS[target].deps:
                if dep.name not in included:
                    targets.append(dep.name)
            for implied in ALL_SERVERS[target].implies:
                if implied.name not in included:
                    targets.append(implied.name)
    return closure


def place_in_startup_order(servers: List[ServerSpec]):
    """Place the given servers in startup order."""
    # Determine all the servers available
    available = set(s.name for s in servers)
    # First, determine the dependencies of each server.
    unfufilled: Dict[str, Set[str]] = {}
    for server in servers:
        unfufilled[server.name] = set(s.name for s in server.deps) & available
    # Now, repeatedly find the server with no dependencies and add it to the
    # output.
    output: List[ServerSpec] = []
    while unfufilled:
        for name, deps in unfufilled.items():
            if not deps:
                output.append(ALL_SERVERS[name])
                del unfufilled[name]
                for other_deps in unfufilled.values():
                    other_deps.discard(name)
                break
        else:
            raise ValueError("Circular dependency detected.")
    return output


def check_already_running(closure: List[ServerSpec]):
    any_running = False
    for spec in closure:
        pid = active_pid(spec.name)
        if pid == 0:
            continue
        click.secho(f"{spec.name}: ALREADY RUNNING! ({pid})", fg=ERROR_COLOR)
        any_running = True
    if any_running:
        raise click.ClickException("Some services are already running.")


def port_is_open(port: int):
    """Check if the given port is open."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def check_ports_available(closure: List[ServerSpec]):
    """Check that the given servers are not already running."""
    busy = False
    for spec in closure:
        click.secho(f"Starting: {color_name(spec)}:", fg=WARNING_COLOR)
        for name, port in spec.ports.items():
            if spec.name == "static" and name != "primary":
                continue
            if port_is_open(port):
                busy = True
                click.secho(f"  {name}: {port} - IN USE", fg=ERROR_COLOR)
            else:
                click.echo(f"  {name}: {port}")
    if busy:
        raise click.ClickException("Some ports are already in use.")


def print_startup_banner(closure: List[ServerSpec]):
    print_banner(
        "All servers are ready! You should be good to go! <3", GOOD_COLOR
    )
    for spec in closure:
        click.secho(f"Running: {color_name(spec)}:", fg=WARNING_COLOR)
        for name, port in spec.ports.items():
            if spec.name == "static" and name != "primary":
                continue
            click.echo(f"  {name}: {port}")


def ensure_bazel_up_to_date(ctx):
    if "BAZEL_DID_BUILD" not in ctx.obj:
        run_bazel(
            ctx.obj["BUILD_CONFIG"],
            hide_output_for_seconds=2,
        )
    ctx.obj["BAZEL_DID_BUILD"] = True


def always_up_to_date_bazel(f):
    """
    Always checks that TypeScript generated dependencies are up-to-date.

    Decorate commands with this guy to have them more diligently check that
    TypeScript deps are up-to-date or not (e.g. by actually running Bazel).
    """

    @click.pass_context
    def with_check(ctx, *args, **kwargs):
        ensure_bazel_up_to_date(ctx)
        return ctx.invoke(f, *args, **kwargs)

    return update_wrapper(with_check, f)


CONTEXT_SETTINGS = dict(help_option_names=["-h", "--help"], show_default=True)


@click.group(
    cls=DefaultGroup,
    default="run",
    default_if_no_args=True,
    context_settings=CONTEXT_SETTINGS,
)
@click.option(
    "--check-ts-deps/--no-check-ts-deps",
    help="Skips building TypeScript generated dependencies.",
    default=True,
)
@click.option(
    "-b",
    "--build-config",
    help="Choose build configuration for generated files (e.g. wasm).",
    default="release",
    type=click.Choice(
        ["debug", "reldebug", "release", "fastbuild"],
    ),
)
@click.pass_context
def cli(ctx, check_ts_deps, build_config):
    ctx.ensure_object(dict)

    ctx.obj["BUILD_CONFIG"] = build_config
    if check_ts_deps:
        updated = ensure_ts_deps_up_to_date(
            build_config=build_config, hide_output_for_seconds=2
        )
        if TsDep.bazel in updated:
            ctx.obj["BAZEL_DID_BUILD"] = True
    else:
        # Mark it as built to prevent the `always_up_to_date_bazel` decorator
        # from trying to build it also.
        ctx.obj["BAZEL_DID_BUILD"] = True


@cli.command()
@click.argument(
    "targets",
    nargs=-1,
    type=click.Choice(
        list(ALL_SERVERS.keys()) + list(TARGET_ALIASES.keys()),
        case_sensitive=False,
    ),
)
def kill(targets):
    """Kill specified TARGETS services if running."""
    if not targets:
        click.secho("Warning: No services specified to kill", fg=WARNING_COLOR)
        return
    for target in expand_targets(targets):
        pid = active_pid(target)
        if pid == 0:
            click.secho(f"{target} not running", fg=WARNING_COLOR)
            continue
        click.secho(f"{target} running as {pid}, killing...", fg=ERROR_COLOR)
        psutil.Process(pid).kill()


@cli.command()
@always_up_to_date_bazel
@click.option(
    "--only/--closure",
    help="Only run the specified services, or the dependency closure",
    default=False,
)
@click.option(
    "--inspect/--no-inspect",
    help="Run services with the inspect flag, so you can attach a debugger",
    default=False,
)
@click.option(
    "--inspect-brk/--no-inspect-brk",
    help="Run services with the inspect-brk flag, so you can attach a debugger",
    default=False,
)
@click.option(
    "--exclude",
    help="Don't run specific services",
    required=False,
    type=click.Choice(
        list(ALL_SERVERS.keys()),
        case_sensitive=False,
    ),
    multiple=True,
)
@click.option(
    "--keep-players/--no-keep-players",
    help="Disable player icing, let them stay around",
    default=GameConfig().keep_players,
)
@click.option(
    "--reset-players/--no-reset-players",
    help="Reset players to their inital state, but preserve positions",
    default=GameConfig().reset_players,
)
@click.option(
    "--login-as",
    help="Override login to act as another user",
    default=GameConfig().login_as,
)
@click.option(
    "--radius",
    help="Radius around the player to load",
    default=GameConfig().radius,
)
@click.option(
    "--xyz",
    help="Player position override",
    default=GameConfig().position,
)
@click.option(
    "--ram",
    help="Number of megabytes to give node processes",
    default=GameConfig().ram,
)
@click.option(
    "--web-ram",
    help="Number of megabytes to give Web processes",
    default=GameConfig().web_ram,
)
@click.option(
    "--bootstrap",
    help="World bootstrap technique",
    default=GameConfig().bootstrap,
    type=click.Choice(["sync", "empty"], case_sensitive=False),
)
@click.option(
    "--assets",
    help="Assets server mode",
    default=GameConfig().assets,
    type=click.Choice(["none", "lazy", "local", "proxy"], case_sensitive=False),
)
@click.option(
    "--storage",
    help="Base storage mode",
    default=GameConfig().storage,
    type=click.Choice(["copy-on-write", "memory"], case_sensitive=False),
)
@click.option(
    "--firehose",
    help="Firehose storage mode",
    default=GameConfig().firehose,
    type=click.Choice(["shim", "memory", "redis"], case_sensitive=False),
)
@click.option(
    "--biscuits",
    help="Biscuits storage mode",
    default=GameConfig().biscuits,
    type=click.Choice(["shim", "memory", "redis"], case_sensitive=False),
)
@click.option(
    "--production-secrets/--no-production-secrets",
    help="Use production secrets",
    default=GameConfig().production_secrets,
)
@click.option(
    "--dev-auth/--no-dev-auth",
    help="Use dev auth",
    default=GameConfig().dev_auth,
)
@click.option(
    "--home-override/--no-home-override",
    help="Override your home location to the center of the map",
    default=GameConfig().home_override,
)
@click.option(
    "--open-admin-access/--no-open-admin-access",
    help="Do not do authentication for admin access.",
    default=GameConfig().open_admin_access,
)
@click.option(
    "--bikkie-static-prefix",
    help="Prefix to prepend to bikkie static asset URLs.",
    default=GameConfig().bikkie_static_prefix,
)
@click.option(
    "--galois-static-prefix",
    help="Prefix to prepend to galois static asset URLs.",
    default=GameConfig().galois_static_prefix,
)
@click.option(
    "--additional-args",
    help="Additional arguments to pass to the server",
    multiple=True,
    type=str,
    default=[],
)
@click.option(
    "--redis/--no-redis",
    help="Use local redis",
    default=False,
)
@click.option(
    "--config",
    help="Biomes server config overrides 'key=value', where value is JSON",
    multiple=True,
    type=str,
    default=[],
)
@click.option(
    "--additional-args",
    help="Additional arguments to pass to the server",
    multiple=True,
    type=str,
    default=[],
)
@click.argument(
    "target",
    nargs=-1,
    type=click.Choice(
        list(ALL_SERVERS.keys()) + list(TARGET_ALIASES.keys()),
        case_sensitive=False,
    ),
)
@click.option(
    "--watch-ts-deps/--no-watch-ts-deps",
    help="Watch dependencies of generated TypeScript files, rebuild on change",
    default=True,
)
@click.option(
    "--local-gcs/--no-local-gcs",
    help="Use local GCS emulator",
    default=GameConfig().local_gcs,
)
@click.pass_context
def run(
    ctx,
    only: bool,
    inspect: bool,
    inspect_brk: bool,
    exclude: List[str],
    storage: StorageMode,
    reset_players: bool,
    keep_players: bool,
    bootstrap: BootstrapMethod,
    radius: int,
    xyz: str,
    ram: Optional[int],
    web_ram: Optional[int],
    firehose: FirehoseMode,
    biscuits: BiscuitsMode,
    assets: AssetMode,
    login_as: int,
    target: List[str],
    home_override: bool,
    redis: bool,
    production_secrets: bool,
    dev_auth: bool,
    config: List[str],
    additional_args: List[str],
    watch_ts_deps: bool,
    open_admin_access: bool,
    bikkie_static_prefix: str,
    galois_static_prefix: str,
    local_gcs: bool,
):
    """Run specified TARGET services."""

    if not target:
        click.secho("Warning: No services specified to run", fg=WARNING_COLOR)
        return
    if redis:
        bootstrap = "empty"
        firehose = "redis"
        biscuits = "redis2"
        additional_args = list(additional_args) + [
            "--chatApiMode",
            "redis",
            "--worldApiMode",
            "hfc-hybrid",
        ]
    if radius and bootstrap != "sync":
        click.secho(
            "Warning: --radius can only be used when using prod-sync!",
            fg=WARNING_COLOR,
        )
    if xyz and bootstrap != "sync":
        click.secho(
            "Warning: --xyz can only be used when using prod-sync!",
            fg=WARNING_COLOR,
        )

    extra_config_overrides = {}
    for kv in config:
        parts = [x.strip() for x in kv.split("=")]
        if len(parts) != 2:
            click.secho(
                f"Could not understand --config override: {kv}", fg=ERROR_COLOR
            )
            return
        try:
            extra_config_overrides[parts[0]] = json.loads(parts[1])
            click.secho(
                f"Config override: {parts[0]}={parts[1]}", fg=WARNING_COLOR
            )
        except:
            click.secho(
                f"Could not understand --config override: {kv}", fg=ERROR_COLOR
            )
            return

    # Determine the environment for the game.
    gameConfig = GameConfig(
        assets=assets,
        bootstrap=bootstrap,
        extra_config_overrides=extra_config_overrides,
        extra_node_args=(["--inspect"] if inspect else [])
        + (["--inspect-brk"] if inspect_brk else []),
        firehose=firehose,
        biscuits=biscuits,
        home_override=home_override,
        keep_players=keep_players,
        login_as=login_as,
        production_secrets=production_secrets,
        dev_auth=dev_auth,
        radius=radius,
        position=xyz,
        ram=ram,
        web_ram=web_ram,
        reset_players=reset_players,
        storage=storage,
        additional_args=additional_args,
        open_admin_access=open_admin_access,
        bikkie_static_prefix=bikkie_static_prefix,
        galois_static_prefix=galois_static_prefix,
        local_gcs=local_gcs,
    )

    # Determine what to run.
    closure = determine_servers(target, include_closure=not only)
    for name in exclude:
        closure.remove(ALL_SERVERS[name])
    closure = place_in_startup_order(closure)
    check_already_running(closure)
    check_ports_available(closure)

    if MAP in closure:
        additional_node_env = {
            "USE_DEV_MAP_INDICES": "1",
        }

    # Start everything
    processes: List[RunProcess] = []
    server_processes: List[Server] = []

    sink = LogSink(closure + ([BAZEL] if watch_ts_deps else []))
    sink_thread = run_thread(sink.run_drain)
    try:
        if watch_ts_deps:
            bazel_watch_process = BazelWatchProcess(
                sink, ctx.obj["BUILD_CONFIG"], disable_sigint=True
            )
            processes.append(bazel_watch_process)
            bazel_watch_process.run()

        startup_threads: Dict[str, Thread] = {}
        for spec in closure:
            spec.disable_sigint = True
            # Wait for any deps we need to be ready
            for dep in spec.deps:
                if dep.name in startup_threads:
                    startup_threads[dep.name].join()
            # Start the server
            if spec.name == "static":
                server = StaticServer(spec, sink)
            else:
                server = Server(gameConfig, spec, sink)
                processes.append(server)
                server_processes.append(server)
            server.run()
            # Track when it's ready
            startup_threads[spec.name] = run_thread(server.wait_for)

        # Wait for all servers to be ready
        for thread in startup_threads.values():
            thread.join()
        print_startup_banner(closure)

        def busyWait():
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt as e:
                time.sleep(0.1)  # Bazel is noisy
                click.secho()
                click.secho("Choose a server to reboot from the following:")
                for i, e in enumerate(server_processes):
                    click.secho(f"\t({i+1}) {e.spec.name}")
                click.secho()
                click.secho(f"\t(a) all but shim")
                click.secho(f"\t(n) none")
                click.secho(f"\t(q) quit")
                choice = click.prompt("Your choice").strip().lower()
                if choice == "q":
                    raise DesireQuitException
                elif choice == "n":
                    click.secho("Okay, ignoring interrupt")
                    return
                elif choice == "a":
                    click.secho("Rebooting all except for shim")
                    for e in server_processes:
                        if e.spec.name != "shim":
                            e.reboot()
                    return
                else:
                    try:
                        i = int(choice)
                        if i < 1 or i > len(server_processes):
                            raise ValueError()
                        process = server_processes[i - 1]
                        click.secho(f"Rebooting {process.spec.name}")
                        server_processes[i - 1].reboot()
                    except ValueError:
                        click.secho(
                            "Invalid choice, ignoring.", fg=WARNING_COLOR
                        )
                        return

        # Wait for sigint
        while True:
            try:
                busyWait()
            except DesireQuitException:
                break
    finally:
        click.secho("Killing all servers", fg=WARNING_COLOR)
        for process in processes:
            process.kill()
        for process in processes:
            process.wait_for_close()
        sink.halt()
        sink_thread.join()
        click.secho("fin.", fg=GOOD_COLOR)


@cli.command()
@click.option(
    "--local/--prod",
    help="Local or production Firehose",
    default=True,
)
def firehose(local):
    """Tail the Firehose"""
    wait_or_die(
        run_node("scripts/node/firehose.ts", ["local"] if local else ["prod"])
    )


@cli.command()
@click.argument("version", type=str)
def redbutton(version):
    """Halt deploy immediately, forcibly move to a given sha maybe"""
    click.secho("Decoupling github from K8...", fg=WARNING_COLOR)
    run_with_hidden_output(0, ["flux", "suspend", "kustomization", "biomes"])
    click.secho("Deployment halted", fg=GOOD_COLOR)
    if version:
        image = f"us-central1-docker.pkg.dev/zones-cloud/b/biomes:{version}"
        click.secho(f"Setting all jobs to image {image}", fg=WARNING_COLOR)
        run_with_hidden_output(
            0,
            [
                "kubectl",
                "set",
                "image",
                "deployment,statefulset",
                "-l app.kubernetes.io/component=biomes",
                f"biomes={image}",
            ],
        )
        click.secho(f"Updated all jobs to {version}", fg=GOOD_COLOR)
    click.secho("*crosses fingers*", fg=GOOD_COLOR)


@cli.group()
def ecs():
    """ECS commands"""
    pass


@ecs.command()
@click.argument("file", type=click.File("r"))
@click.argument("id", type=int)
def filter(file, id):
    """Filter an ECS log by a particular entity ID"""
    for line in file:
        if str(id) not in line:
            continue
        record = json.loads(line)
        if "ecs" not in record:
            continue
        changes = record["ecs"]
        for wrapper in changes:
            if "change" not in wrapper:
                continue
            change = wrapper["change"]
            if "id" in change and change["id"] == id:
                click.secho(json.dumps(change, indent=2), fg=WARNING_COLOR)
                continue
            if "entity" in change and change["entity"]["id"] == id:
                click.secho(json.dumps(change, indent=2), fg=WARNING_COLOR)
                continue


@cli.command()
@click.argument("message", nargs=-1)
def halp(message: List[str]):
    """Create a linear task for help with local development"""
    click.secho(f"Seeking halp...")

    wait_or_die(
        run_node(
            "scripts/node/halp.ts",
            args=[" ".join(message)],
            extra_env={"NODE_NO_WARNINGS": "1"},
        )
    )


@cli.command()
@click.option(
    "--inspect-brk/--no-inspect-brk",
    help="Run node with the inspect-brk flag, so you can attach a debugger",
    default=False,
)
@click.argument("name")
@click.option(
    "--prod/--local", help="Run the script on production ECS.", default=False
)
@click.argument("args", nargs=-1)
def script(inspect_brk, name, prod, args):
    """Run a script"""
    script_env = {"NODE_NO_WARNINGS": "1"}
    if not prod:
        script_env[
            "BIOMES_OVERRIDE_SYNC"
        ] = f"http://localhost:{SYNC.port}/sync"
        click.secho(
            "Running script locally (must have local dev started). To run against prod, run './b script --prod ...'"
        )
    else:
        click.secho("Script will run against production ECS.")
        click.pause()

    wait_or_die(
        run_node(
            f"scripts/node/{name}.ts",
            list(args),
            extra_env=script_env,
            extra_node_args=["--inspect-brk"] if inspect_brk else [],
        )
    )


@cli.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.option("--wtf/--no-wtf", default=False)
@click.option("-p", "--path", default="'src/**{/test/*.ts,/*.test.ts}'")
@click.argument("args", nargs=-1)
def test(args, path, wtf):
    """Run TypeScript tests."""
    run_mocha(
        [
            path,
            "--ignore",
            "'**/node_modules/**/*'",
            "--ignore",
            "'src/cayley/**'",
            "--ignore",
            "'src/benchmarks/**'",
        ]
        + (list(args) or []),
        wtf,
    )


def run_mocha(args, wtf=False):
    """Run TypeScript tests."""
    return run_yarn_env(
        (["wtfnode"] if wtf else [])
        + [
            "node_modules/.bin/mocha",
        ]
        + (list(args) or []),
        env={
            "TS_NODE_COMPILER_OPTIONS": '{"module": "commonjs" }',
            "MOCHA_TEST": "1",
        },
    )


@cli.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    )
)
@click.argument("args", nargs=-1)
def typecheck(args):
    """Typecheck all TypeScript code."""

    run_yarn_env(
        ["tsc", "--noEmit", "--incremental"] + list(args) or [],
        node_options=["--max-old-space-size=8192"],
    )


@cli.group()
def build():
    """Subcommand for building project features."""
    pass


@build.command()
def server():
    """Builds the server bundle."""
    run_yarn_env(["scripts/build_server.sh"])


@build.command()
def next():
    """Builds the nextjs app bundle."""
    run_yarn_env(["next", "build"])


@cli.group()
def ts_deps():
    """Commands for managing the TypeScript generated dependencies."""
    pass


@ts_deps.command("build")
@click.pass_context
def ts_deps_build_cmd(ctx):
    """Ensures Bazel generated dependencies are up-to-date."""
    run_bazel(ctx.obj["BUILD_CONFIG"], print_command=True)


@ts_deps.command("watch")
@click.pass_context
def ts_deps_watch_cmd(ctx):
    """Watches source file changes and triggers rebuilds on change."""
    watch_ts_deps(ctx.obj["BUILD_CONFIG"])


@build.group()
def autocomplete():
    pass


@autocomplete.command("cpp")
def build_autocomplete_cpp():
    """Ensure files for enabling autocomplete in C++ are up-to-date."""
    click.secho("Refreshing C++ autocomplete file '/compile_commands.json'...")
    refresh_compile_commands = "//src/bazel_utils/cpp:refresh_compile_commands"

    # While intermediate target outputs are created in bazel-out/k8-fastbuild
    # where refresh_compile_commands expects them, if they are behind a
    # transition they end up in a different directory, so we must explicitly
    # build those targets here to ensure they are visible to autocomplete.
    explicit_build_targets = ["//voxeloo/common:geometry_src"]

    # Explicitly build the target first for the logging and progress updates,
    # because we're going to silence stderr when we actually run it.
    build_command = [
        "bazel",
        "build",
        refresh_compile_commands,
    ] + explicit_build_targets
    click.secho(f"Running '{' '.join(build_command)}'")
    subprocess.run(build_command)
    click.secho(f"Running 'bazel run {refresh_compile_commands}'")
    subprocess.run(
        ["bazel", "run", refresh_compile_commands],
        # This command can be very noisy even when it's successful.
        stderr=subprocess.DEVNULL,
    )

    click.secho("Done refreshing C++ autocomplete.")


@autocomplete.command("rust")
def build_autocomplete_rust():
    """Ensure files for enabling autocomplete in Rust are up-to-date."""
    click.secho("Refreshing Rust autocomplete file '/rust-project.json'.")
    subprocess.run(
        ["bazel", "run", "@rules_rust//tools/rust_analyzer:gen_rust_project"],
    )
    click.secho("Done refreshing Rust autocomplete.")


@autocomplete.command("all")
@click.pass_context
def build_autocomplete_all(ctx):
    """Ensures all autocomplete files are up-to-date."""
    ctx.invoke(build_autocomplete_cpp)
    ctx.invoke(build_autocomplete_rust)


@cli.group()
def backup():
    """Commands for managing backups."""
    pass


def latest_backup_path():
    date = datetime.now()
    path = f"gs://biomes-backup/world/{date.year}/{date.month}/{date.day}"
    output = subprocess.check_output(
        ["gcloud", "storage", "ls", path], text=True
    )
    return output.strip().split("\n")[-1]


@backup.command()
def latest():
    click.secho(f"Found latest backup: {latest_backup_path()}")


@backup.command()
@click.argument("destination")
def fetch(destination):
    subprocess.check_call(
        ["gcloud", "storage", "cp", latest_backup_path(), destination]
    )


@cli.group()
def lint():
    """Applies linters to the codebase."""
    pass


@lint.command(
    "ts",
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True,
        # Leave "--help" available to be forwarded to the test runner.
        help_option_names=["--bhelp"],
    ),
)
@click.argument("args", nargs=-1)
def lint_ts(args):
    """Lints the TypeScript codebase."""
    run_yarn_env(
        ["next", "lint"] + list(args) or [],
        node_options=["--max-old-space-size=8192"],
    )


@lint.command()
@click.option(
    "--fix/--no-fix",
    default=False,
    help="When set, will apply suggested fixes.",
)
def css(fix):
    """Lints the CSS codebase."""
    run_yarn_env(
        ["stylelint", "src/client/{**/*,*}.css", "src/galois/{**/*,*}.css"]
        + (["--fix"] if fix else []),
    )


@cli.command()
def circular():
    """Runs madge to check for circular dependencies."""
    run_yarn_env(
        [
            "madge",
            "--ts-config",
            "./tsconfig.json",
            "--circular",
            "--extensions",
            "ts,tsx",
            "./",
        ],
    )


@cli.command()
def deps_check():
    """Runs dependency-cruiser to check for folder dependency violations."""
    run_yarn_env(
        [
            "depcruise",
            "--config",
            ".dependency-cruiser.js",
            "src",
        ],
    )


@cli.command(
    context_settings=dict(
        # Forward all CLI parameters to the test runner.
        ignore_unknown_options=True
    )
)
@click.argument("args", nargs=-1)
def v8_profiler_benchmarks(args):
    """Runs our suite of V8 compiler benchmarks."""
    run_mocha(
        [
            "-n",
            "expose-gc",
            "--timeout",
            "30000",
            "-r",
            "ts-node/register",
            "--reporter",
            "list",
            "-r",
            "src/benchmarks/root_hooks.ts",
            "'src/benchmarks/**/*.ts'",
        ]
        + (list(args) or [])
    )


def entrypoint():
    load_dotenv()
    load_dotenv(".env.local")
    cli(prog_name="./b")


cli.add_command(galois_commands)
cli.add_command(data_snapshot_commands)

if __name__ == "__main__":
    entrypoint()

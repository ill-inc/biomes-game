import os
import subprocess
from functools import update_wrapper
from pathlib import Path
import b
import click
from pip_install_voxeloo import run_pip_install_voxeloo, run_pip_install_requirements
import time
import shutil
import tempfile
import hashlib


SCRIPT_DIR = Path(os.path.dirname(os.path.realpath(__file__)))
REPO_DIR = SCRIPT_DIR / ".." / ".."

SNAPSHOT_BUCKETS_DIR_NAME = "buckets"
SNAPSHOT_BUCKETS_PATH = REPO_DIR / "public" / SNAPSHOT_BUCKETS_DIR_NAME
SNAPSHOT_BUCKETS_URL_PREFIX = f"/{SNAPSHOT_BUCKETS_DIR_NAME}/"
STATIC_BUCKET_PATH = SNAPSHOT_BUCKETS_PATH / "biomes-static"
BIKKIE_BUCKET_PATH = SNAPSHOT_BUCKETS_PATH / "biomes-bikkie"
BIKKIE_STATIC_PREFIX = f"{SNAPSHOT_BUCKETS_URL_PREFIX}biomes-bikkie/"
GALOIS_STATIC_PREFIX = f"{SNAPSHOT_BUCKETS_URL_PREFIX}biomes-static/"

GS_URL_BASE = "gs://biomes-static"
DOWNLOAD_URL_BASE = "https://static.biomes.gg"

DATA_SNAPSHOT_FILENAME = "biomes_data_snapshot.tar.gz"
DATA_SNAPSHOT_GS_URL = f"{GS_URL_BASE}/{DATA_SNAPSHOT_FILENAME}"
DATA_SNAPSHOT_DOWNLOAD_URL = f"{DOWNLOAD_URL_BASE}/{DATA_SNAPSHOT_FILENAME}"

SNAPSHOT_BACKUP_PATH = REPO_DIR / "snapshot_backup.json"

REDIS_BOOTSTRAP_HASH_KEY = "biomes_data_snapshot_hash"


@click.group()
def data_snapshot():
    """Commands for working with data snapshots."""
    pass


@data_snapshot.command()
@click.argument(
    "path",
    type=str,
)
@click.pass_context
def create_to_file(ctx, path: str):
    """Creates a data snapshot by pulling from prod. Needs gcloud auth."""

    if not path.endswith(".tar.gz"):
        raise RuntimeError(f"Path '{path}' does not end with '.tar.gz'.")

    # Ensure path doesn't already exist.
    if os.path.exists(path):
        raise RuntimeError(f"Path '{path}' already exists.")

    # Create a temporary directory to collect snapshot files in.
    with tempfile.TemporaryDirectory() as tmpdir:
        backup_file = Path(tmpdir) / "backup.json"
        buckets_dir = Path(tmpdir) / "buckets"

        # Pull the latest backup file.
        click.secho("Downloading the latest backup file...")
        ctx.invoke(b.fetch, destination=backup_file)

        # Download the bucket asset data.
        click.secho("Downloading static assets...")
        ctx.invoke(b.script, name="extract_assets", args=[buckets_dir])

        # Tar up the directory.
        click.secho("Creating tarball...")
        subprocess.run(["tar", "-czf", path, "-C", tmpdir, "."])

    click.secho(f"Created data snapshot at '{path}'.")


@data_snapshot.command()
@click.argument(
    "path",
    type=str,
)
def upload_from_file(path: str):
    """Uploads specified file to GCS as the new current data snapshot. Needs gcloud auth."""

    # Check that path exists.
    if not os.path.exists(path):
        raise RuntimeError(f"Path '{path}' does not exist.")

    click.secho(
        f"Uploading data snapshot from file '{path}' to '{DATA_SNAPSHOT_GS_URL}'..."
    )
    subprocess.run(["gsutil", "cp", path, DATA_SNAPSHOT_GS_URL])

    click.secho("Done uploading data snapshot.")


def hash_file(path: str):
    """Returns the MD5 hash of the file at path."""
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


@data_snapshot.command()
@click.pass_context
def push(ctx):
    """Creates new data snapshot and uploads it to GCS as new current. Needs gcloud auth."""

    # Create temporary directory work within.
    with tempfile.TemporaryDirectory() as tmpdir:
        path = str(Path(tmpdir) / DATA_SNAPSHOT_FILENAME)

        ctx.invoke(create_to_file, path=path)
        ctx.invoke(upload_from_file, path=path)


@data_snapshot.command()
@click.argument(
    "path",
    type=str,
)
def install_from_file(path: str):
    """Install a data snapshot from a file."""
    click.secho(f"Installing data snapshot from file '{path}'...")

    # Ensure the file exists.
    if not os.path.exists(path):
        raise RuntimeError(f"File '{path}' does not exist.")

    # Create a temporary directory to unpack into.
    with tempfile.TemporaryDirectory() as tmpdir:
        # Unpack the file.
        subprocess.run(["tar", "-xzf", path, "-C", tmpdir])

        # Install the snapshot files.
        shutil.move(Path(tmpdir) / "backup.json", SNAPSHOT_BACKUP_PATH)
        # Ensure that the snapshot buckets directory exists.
        SNAPSHOT_BUCKETS_PATH.mkdir(exist_ok=True, parents=True)
        # Move the contents of "buckets" into the snapshot buckets directory.
        for file in (Path(tmpdir) / "buckets").iterdir():
            # First remove the directory if it already exists.
            dir = SNAPSHOT_BUCKETS_PATH / file.name
            if (dir).exists():
                shutil.rmtree(dir)
            shutil.move(file, dir)

    click.secho(f"Done installing data snapshot.")


@data_snapshot.command()
def uninstall():
    """Removes all installed data snapshot files from your repository."""
    # Remove SNAPSHOT_BACKUP_PATH.
    if SNAPSHOT_BACKUP_PATH.exists():
        SNAPSHOT_BACKUP_PATH.unlink()

    # Remove the specific buckets directory.
    if STATIC_BUCKET_PATH.exists():
        shutil.rmtree(STATIC_BUCKET_PATH)

    if BIKKIE_BUCKET_PATH.exists():
        shutil.rmtree(BIKKIE_BUCKET_PATH)


def is_installed():
    return (
        SNAPSHOT_BACKUP_PATH.exists()
        and STATIC_BUCKET_PATH.exists()
        and BIKKIE_BUCKET_PATH.exists()
    )


@data_snapshot.command()
@click.argument(
    "path",
    type=str,
)
def download_to_file(path: str):
    """Install a data snapshot from a file."""
    click.secho(
        f"Downloading latest data snapshot from '{DATA_SNAPSHOT_DOWNLOAD_URL}' to '{path}'..."
    )

    # Ensure the output file does not already exist.
    if os.path.exists(path):
        raise RuntimeError(f"File '{path}' already exists.")

    # Download the file. Use curl to get a progress bar.
    subprocess.run(["curl", DATA_SNAPSHOT_DOWNLOAD_URL, "--output", path])

    click.secho(f"Data snapshot downloaded to {path}.")


@data_snapshot.command()
@click.pass_context
def pull(ctx):
    """If out of date, downloads and installs the latest snapshot data."""

    # Check to see if we already have the latest snapshot, by comparing the contents of DATA_SNAPSHOT_HASH_DOWNLOAD_URL with the contents of SNAPSHOT_HASH_PATH.
    if is_installed():
        click.secho(f"Snapshot is already installed, nothing to do.")
        return

    # Create a temporary data to download to.
    with tempfile.TemporaryDirectory() as tmpdir:
        path = str(Path(tmpdir) / DATA_SNAPSHOT_FILENAME)

        # Download the snapshot.
        ctx.invoke(download_to_file, path=path)

        # Install the snapshot.
        ctx.invoke(install_from_file, path=path)

    click.secho(f"Installed snapshot data is up-to-date.")


@data_snapshot.command()
@click.pass_context
def populate_redis(ctx):
    """Populate a running redis-server with the installed snapshot data."""
    if not redis_server_started():
        raise RuntimeError("Expected redis-server to be started already.")

    # If we've previously bootstrapped, check with the user before proceeding
    # to clear and overwrite.
    if redis_cli(f"exists {REDIS_BOOTSTRAP_HASH_KEY}").strip() == "1":
        click.secho(
            "Your Redis DB has been bootstrapped with older data, proceeding will reset it with new data."
        )

    # Clear out the local redis database before proceeding to bootstrap it.
    if not click.confirm("Clearing data on your local redis-server. Proceed?"):
        return
    redis_cli("flushall")

    click.secho(
        f"Populating redis with data from backup file '{SNAPSHOT_BACKUP_PATH}'...."
    )
    ctx.invoke(b.script, name="bootstrap_redis", args=[SNAPSHOT_BACKUP_PATH])

    # Remember the hash of the backup that we bootstrapped redis with.
    hash = hash_file(SNAPSHOT_BACKUP_PATH)
    redis_cli(f"set {REDIS_BOOTSTRAP_HASH_KEY} {hash}")
    redis_cli("save")

    click.secho("Done populating redis.")


@data_snapshot.command()
@click.pass_context
def ensure_redis_populated(ctx):
    """Populate a running redis-server with the installed snapshot data."""
    if not redis_server_started():
        raise RuntimeError("Expected redis-server to be started already.")

    # Ensure that SNAPSHOT_HASH_PATH exists, since it marks if installation
    # has been performed.
    if not is_installed():
        raise RuntimeError("No data snapshot has been installed.")

    # Compare the current hash of the data snapshot that we bootstrapped redis with to the hash of the installed snapshot data.
    installed_hash = hash_file(SNAPSHOT_BACKUP_PATH)
    bootstrapped_hash = redis_cli(f"get {REDIS_BOOTSTRAP_HASH_KEY}")
    if installed_hash.strip() == bootstrapped_hash.strip():
        click.secho(
            "Redis is already populated with the installed snapshot data."
        )
        return

    ctx.invoke(populate_redis)


@data_snapshot.command()
@click.option(
    "--pip-install/--no-pip-install",
    help="Whether or not `pip install ./voxeloo` will get called before commands that need it.",
    default=True,
)
@click.pass_context
def run(ctx, pip_install: bool):
    """Run with from data snapshot."""
    if pip_install:
        run_pip_install_requirements()
        run_pip_install_voxeloo()

    subprocess.run(["git", "lfs", "pull"], cwd=REPO_DIR, check=True)

    # Make sure our data snapshot exists and is up-to-date.
    ctx.invoke(pull)

    with RedisServer():
        # Make sure our Redis server is populated with the data snapshot.
        ctx.invoke(ensure_redis_populated)

        # Actually run a local Biomes server.
        ctx.invoke(
            b.run,
            target=["web"],
            redis=True,
            storage="memory",
            assets="local",
            open_admin_access=True,
            bikkie_static_prefix=BIKKIE_STATIC_PREFIX,
            galois_static_prefix=GALOIS_STATIC_PREFIX,
            local_gcs=True,
        )


def redis_cli(command: str, db=0):
    args = ["redis-cli", "-n", str(db)]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    return p.communicate(command.encode(), timeout=60)[0].decode()


def redis_server_started():
    ping = subprocess.Popen(["redis-cli", "ping"], stdout=subprocess.PIPE)
    return ping.communicate()[0] == b"PONG\n"


class RedisServer(object):
    def __init__(self):
        pass

    def __enter__(self):
        click.secho("Starting redis-server...")
        self.process = subprocess.Popen("redis-server")
        # Wait for server to start.
        start_time = time.time()
        while True:
            if redis_server_started():
                break
            time.sleep(1)
            if time.time() - start_time > 15:
                self.process.terminate()
                raise RuntimeError("redis-server failed to start.")
        click.secho("redis-server started...")

        return self.process

    def __exit__(self, *args):
        click.secho("Killing redis-server...")
        self.process.kill()
        try:
            self.process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            click.secho(
                "redis-server timed out while shutting down, terminating."
            )
            self.process.terminate()

        click.secho("redis-server shutdown.")

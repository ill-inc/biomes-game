import hashlib
import json
import sqlite3
import sys
from functools import cached_property
from typing import List

from impl.repo import workspace_dir


def log(*args, **kwargs):
    print(*args, **kwargs, file=sys.stderr)


def hash_sources(srcs):
    hasher = hashlib.new("md5")
    for file in srcs:
        path = workspace_dir() / file
        if not path.is_file():
            hasher.update(bytes("0", "utf-8"))
        else:
            with open(path, "rb") as f:
                hasher.update(bytes("1", "utf-8"))
                hasher.update(f.read())
    return hasher.hexdigest()


# Bump this to invalidate the cache.
VERSION = 2


class Sources:
    def __init__(self, hash, srcs, version):
        self.hash = hash
        self.srcs = srcs
        self.version = version

    @cached_property
    def unchanged(self):
        return self.version == VERSION and self.hash == hash_sources(self.srcs)


INDEX_PATH = "hashes.db"


def load_db(path):
    ret = []
    con = sqlite3.connect(path)
    try:
        cur = con.cursor()
        for key, val in cur.execute("SELECT key, val FROM cache"):
            try:
                hash, srcs, version = json.loads(val)
                ret.append([key, hash, srcs, version])
            except Exception:
                pass
    except Exception:
        pass
    con.close()
    return ret


def save_db(path, db):
    con = sqlite3.connect(path)
    try:
        con.execute(
            "CREATE TABLE IF NOT EXISTS cache (key TEXT UNIQUE, val TEXT);"
        )
        for key, hash, srcs, version in db:
            con.execute(
                "REPLACE INTO cache (key, val) VALUES (?, ?)",
                (key, json.dumps([hash, srcs, version])),
            )
        con.commit()
    except Exception as e:
        log("Error saving incremental cache: ", e)
    con.close()


class QueryIndex:
    def __init__(self, path=INDEX_PATH):
        self.path = path
        self.db = {}
        self.changes = {}

    def key(self, code: str):
        return hashlib.md5(code.encode("utf-8")).hexdigest()

    def unchanged(self, code: str):
        key = self.key(code)
        if key in self.db:
            return self.db[key].unchanged
        return False

    def update(self, code: str, srcs: List[str]):
        self.changes[self.key(code)] = Sources(
            hash_sources(srcs), srcs, VERSION
        )

    def load(self):
        db = load_db(self.path)
        self.db.clear()
        for key, hash, srcs, version in db:
            self.db[key] = Sources(hash, srcs, version)

    def dump(self):
        db = []
        for key, srcs in sorted(self.changes.items(), key=lambda kv: kv[0]):
            db.append([key, srcs.hash, srcs.srcs, srcs.version])
        save_db(self.path, db)

    def __enter__(self):
        self.load()
        return self

    def __exit__(self, type, value, traceback):
        self.dump()

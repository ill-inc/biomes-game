from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class FileLog:
    files: List[str]


FILE_LOG = FileLog([])
WORKSPACE_DIR: Optional[Path] = None


def init_workspace_dir(workspace_dir: str):
    global WORKSPACE_DIR
    WORKSPACE_DIR = Path(workspace_dir)


def workspace_dir():
    assert WORKSPACE_DIR, "init_workspace_dir() was not called."
    return WORKSPACE_DIR


def pop_file_log():
    ret = FILE_LOG.files
    FILE_LOG.files = []
    return ret


def open_file(path: str, *, binary=False):
    FILE_LOG.files.append(str(path))
    return open(workspace_dir() / path, "rb" if binary else "r")


def is_file(path: str):
    FILE_LOG.files.append(str(path))
    return (workspace_dir() / path).is_file()

import base64
from impl.repo import open_file


def path_to_content(path: str) -> bytes:
    if path.startswith("data:"):
        parts = path.split(",")
        if len(parts) != 2:
            raise ValueError(f"Invalid data URI: {path}")
        return base64.b64decode(parts[1])
    else:
        with open_file(path, binary=True) as f:
            return f.read()

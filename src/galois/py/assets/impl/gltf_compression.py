import os
import subprocess
import tempfile
from pathlib import Path

import pygltflib


# TODO(top): The fact that we're shelling out here to a subprocess isn't
#            excellent:
#
#              1. The subprocess interfaces through files, so we need to create
#                 temporary files, introducing a dependency on the filesystem.
#              2. It introduces a difficult-to-track dependency on the
#                 environment in that the `gltfpack` yarn command needs to be
#                 available.
#
#            However, Python doesn't really offer any options for glTF
#            compression libraries. The ideal solution would have us depend on
#            the C++ library that backs gltfpack, https://meshoptimizer.org/,
#            and call it directly here. Because we don't currently have a
#            great setup here for arbitrary C++ <-> Python interaction
#            (especially for C++ libraries that have nothing to do with Python).
#
#            Additionally, for concern 1 above, we do cleanup the files
#            afterwards, and for concern 2 we do test this function in our CI
#            tests, this seems like a reasonable solution for the near term.
def compress_gltf(gltf: pygltflib.GLTF2) -> bytes:
    gltf_bytes = gltf.gltf_to_json()
    with tempfile.TemporaryDirectory() as temp_dir:
        GLTF_FILE_NAME = Path(temp_dir) / "to_compress.gltf"
        GLB_FILE_NAME = Path(temp_dir) / "compressed.glb"

        with open(GLTF_FILE_NAME, "w") as gltf_file:
            gltf_file.write(gltf_bytes)

        # If we're on Windows, run this through a shell or else it can't
        # find yarn.
        useShell = os.name == "nt"

        cmd = [
            "yarn",
            "gltfpack",
            "-i",
            str(GLTF_FILE_NAME),
            "-o",
            str(GLB_FILE_NAME),
            "-kn",  # Don't prune empty nodes, used as attachment points.
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, shell=useShell)

        with open(GLB_FILE_NAME, "rb") as glb_file:
            out_bytes = glb_file.read()
            return out_bytes

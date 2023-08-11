from dataclasses import dataclass

from impl import types as t


# Not much to do here right now besides validate the "type conversion" to
# WEBM. If in the future we want to parse the WEBM file at all though, this would
# be the place to do it.
def load_webm(webm_data: bytes) -> t.WEBM:
    return t.WEBM(data=webm_data)

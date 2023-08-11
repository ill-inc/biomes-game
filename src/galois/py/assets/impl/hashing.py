import numpy as np


def random_hash(x: int):
    x = int(x)
    x ^= x >> 16
    x *= 0x7FEB352D
    x ^= x >> 15
    x *= 0x846CA68B
    x ^= x >> 16
    return x


def position_hash(x: int, y: int, z: int):
    return random_hash(x + random_hash(y + random_hash(z)))

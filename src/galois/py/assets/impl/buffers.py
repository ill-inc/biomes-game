import math
from typing import List, Union

import impl.types as t
import numpy as np

# Buffers are consumed as 2D textures. We layout the buffer data into rows with
# the following width to maximimize how much space we can pack into a texture.
BUFFER_WIDTH = 2048


def make_uint_buffer(data: Union[np.ndarray, List[int]]):
    array = np.array(data, dtype=np.uint32).flatten()
    padded_size = math.ceil(len(array) / BUFFER_WIDTH) * BUFFER_WIDTH
    padded = np.pad(array, (0, padded_size - len(array)))
    return t.ArrayData(padded.reshape(-1, BUFFER_WIDTH))

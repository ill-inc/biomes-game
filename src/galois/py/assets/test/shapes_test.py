import unittest

import numpy as np
from impl import maps, shapes
from impl import types as t


class ShapesTestCase(unittest.TestCase):
    def test_occlusion_maps(self):
        full = t.BlockShape(
            map=maps.Map(
                origin=(0, 0, 0),
                values=np.ones((8, 8, 8), dtype=bool),
            )
        )

        index = shapes.to_index([[1, "full", full]])

        tensor = t.BlockShapeTensor(
            map=maps.Map(
                origin=(0, 0, 0), values=np.zeros((32, 32, 32), dtype=np.int32)
            )
        )
        tensor.map.values[1, 0, 1:15] = shapes.to_concrete_id(1, 0)
        tensor.map = tensor.map.compress()

        occlusion_tensor = shapes.to_occlusion_tensor(tensor, index)

        self.assertEqual(occlusion_tensor.map.values[0, 0, 0], 0)
        for x in range(1, 15):
            self.assertEqual(occlusion_tensor.map.values[0, 0, x], 32)
        self.assertEqual(occlusion_tensor.map.values[0, 0, 15], 0)

        self.assertEqual(occlusion_tensor.map.values[1, 0, 0], 2)
        self.assertEqual(occlusion_tensor.map.values[1, 0, 1], 2)
        for x in range(2, 14):
            self.assertEqual(occlusion_tensor.map.values[1, 0, x], 3)
        self.assertEqual(occlusion_tensor.map.values[1, 0, 14], 1)
        self.assertEqual(occlusion_tensor.map.values[1, 0, 15], 1)

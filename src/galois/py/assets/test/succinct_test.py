import unittest

import numpy as np
from impl import maps
from impl.succinct import get_rank, to_rank_dict


class SuccinctTestCase(unittest.TestCase):
    def test_basic_usage(self):
        values = np.zeros(shape=(32, 32, 32), dtype=bool)
        values[0, 0, 1] = True
        values[0, 0, 3] = True
        values[0, 0, 5] = True
        dict = to_rank_dict(mask=maps.Map(origin=(0, 0, 0), values=values))

        # Extract all of the positions.
        self.assertEqual(get_rank(dict, 1, 0, 0), 0)
        self.assertEqual(get_rank(dict, 2, 0, 0), 1)
        self.assertEqual(get_rank(dict, 3, 0, 0), 1)
        self.assertEqual(get_rank(dict, 5, 0, 0), 2)
        self.assertEqual(get_rank(dict, 5, 0, 0), 2)
        self.assertEqual(get_rank(dict, 6, 0, 0), 3)
        self.assertEqual(get_rank(dict, 0, 0, 6), 3)
        self.assertEqual(get_rank(dict, 2, 4, 6), 3)
        self.assertEqual(get_rank(dict, 31, 31, 31), 3)

    def test_maps_with_nonzero_origin(self):
        values = np.zeros(shape=(24, 24, 24), dtype=bool)
        values[0, 0, 0] = True
        values[1, 2, 1] = True
        values[1, 2, 3] = True
        dict = to_rank_dict(mask=maps.Map(origin=(4, 4, 4), values=values))

        # Extract all of the positions.
        self.assertEqual(get_rank(dict, 0, 0, 0), 0)
        self.assertEqual(get_rank(dict, 4, 4, 4), 0)
        self.assertEqual(get_rank(dict, 5, 4, 4), 1)
        self.assertEqual(get_rank(dict, 5, 6, 5), 1)
        self.assertEqual(get_rank(dict, 6, 6, 5), 2)
        self.assertEqual(get_rank(dict, 7, 6, 5), 2)
        self.assertEqual(get_rank(dict, 8, 6, 5), 3)
        self.assertEqual(get_rank(dict, 31, 31, 31), 3)

    def test_filled_array(self):
        values = np.zeros(shape=(32, 32, 32), dtype=bool)
        for y in range(2):
            for z in range(2):
                for x in range(4):
                    values[z, y, x] = True
        dict = to_rank_dict(mask=maps.Map(origin=(0, 0, 0), values=values))

        # Extract all of the positions.
        rank = 0
        for y in range(2):
            for z in range(2):
                for x in range(4):
                    self.assertEqual(get_rank(dict, x, y, z), rank)
                    rank += 1
        self.assertEqual(get_rank(dict, 5, 2, 2), rank)

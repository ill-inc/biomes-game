# DEPRECATED: Going to replace this guy with CPP tensors

from dataclasses import dataclass
from typing import Any, Dict, Generic, Tuple, TypeVar

import numpy as np


@dataclass
class Map:
    origin: Tuple[int, int, int]
    values: np.ndarray

    def copy(self):
        return Map(self.origin, self.values.copy())

    def aabb(self):
        return np.array(
            [
                self.origin,
                self.origin + np.array(self.values.shape[::-1]),
            ]
        )

    def fit(self, lo, hi):
        lo, hi = np.array(lo), np.array(hi)
        out = np.zeros(shape=tuple(hi - lo)[::-1], dtype=self.values.dtype)
        ax0, ay0, az0 = self.aabb()[0] - lo
        ax1, ay1, az1 = self.aabb()[1] - lo

        out[az0:az1, ay0:ay1, ax0:ax1] = self.values[:, :, :]
        next = Map(origin=lo, values=out)
        return next

    def compress(self):
        nonzeros = np.stack(np.where(self.values != 0), axis=-1)
        if nonzeros.shape[0] == 0:
            return Map(
                origin=(0, 0, 0),
                values=np.zeros(shape=(0, 0, 0), dtype=self.values.dtype),
            )
        else:
            z0, y0, x0 = np.min(nonzeros, axis=0)
            z1, y1, x1 = np.max(nonzeros, axis=0) + 1
            return Map(
                origin=self.origin + np.array([x0, y0, z0]),
                values=self.values[z0:z1, y0:y1, x0:x1],
            )


T = TypeVar("T")


@dataclass
class Table(Generic[T]):
    index: Dict[int, T]
    map: Map

    def compress(self):
        ret = Table({}, self.map.compress())

        # Generate the new compact index.
        values = {
            val
            for key, val in self.index.items()
            if np.any(ret.map.values == key)
        }
        ret.index = {
            i + 1: val for i, val in enumerate(sorted(values, key=hash))
        }

        # Remap values to conform to the new index.
        reverse = {val: i for i, val in ret.index.items()}
        pre_values = ret.map.values.copy()
        for key, val in self.index.items():
            if val in reverse:
                ret.map.values[pre_values == key] = reverse[val]

        return ret


def empty_map(dtype):
    return Map(
        origin=(0, 0, 0),
        values=np.zeros(shape=(0, 0, 0), dtype=dtype),
    )


def align_maps(lhs: Map, rhs: Map):
    """Returns equivalent copies of the given maps but with common shapes."""
    lo = np.minimum(lhs.aabb()[0], rhs.aabb()[0])
    hi = np.maximum(lhs.aabb()[1], rhs.aabb()[1])
    return (
        lhs.fit(lo, hi),
        rhs.fit(lo, hi),
    )


def align_tables(lhs: Table, rhs: Table):
    """Modifies the two tables so they share a common index."""
    values = set(lhs.index.values()) | set(rhs.index.values())
    reverse = {val: i + 1 for i, val in enumerate(sorted(values, key=hash))}

    # Re-index the lhs map.
    new_lhs = Table({}, lhs.map.copy())
    for key, val in lhs.index.items():
        new_lhs.index[reverse[val]] = val
        new_lhs.map.values[lhs.map.values == key] = reverse[val]

    # Re-index the rhs map.
    new_rhs = Table({}, rhs.map.copy())
    for key, val in rhs.index.items():
        new_rhs.index[reverse[val]] = val
        new_rhs.map.values[rhs.map.values == key] = reverse[val]

    # Also align the maps.
    lhs_map, rhs_map = align_maps(new_lhs.map, new_rhs.map)
    new_rhs.map = rhs_map
    new_lhs.map = lhs_map

    return (new_lhs, new_rhs)


def to_sparse_coords(map: Map):
    z, y, x = np.where(map.values != 0)
    ret = np.stack([x, y, z, map.values[z, y, x]], axis=-1)
    ret[:, 0:3] += map.origin
    return ret


def difference_masks(lhs: Map, rhs: Map):
    lhs, rhs = align_maps(lhs, rhs)
    lhs.values = lhs.values ^ (lhs.values & rhs.values)
    return lhs.compress()


def intersect_masks(lhs: Map, rhs: Map):
    lhs, rhs = align_maps(lhs, rhs)
    lhs.values = lhs.values & rhs.values
    return lhs.compress()


def union_masks(lhs: Map, rhs: Map):
    lhs, rhs = align_maps(lhs, rhs)
    lhs.values = lhs.values | rhs.values
    return lhs.compress()


def clear_map(map: Map, msk: Map):
    t_map, m_map = align_maps(map, msk)
    t_map.values[m_map.values] = 0
    return t_map.compress()


def merge_maps(lhs: Map, rhs: Map):
    lhs, rhs = align_maps(lhs, rhs)
    msk = rhs.values != 0
    lhs.values[msk] = rhs.values[msk]
    return lhs.compress()


def slice_map(map: Map, msk: Map):
    t_map, m_map = align_maps(map, msk)
    t_map.values[m_map.values == 0] = 0
    return t_map.compress()


def write_map(map: Table, msk: Map, val: Any):
    t_map, m_map = align_maps(map, msk)
    t_map.values[m_map.values] = val
    return t_map.compress()


def clear_table(table: Table, mask: Map):
    t_map, m_map = align_maps(table.map, mask)
    t_map.values[m_map.values] = 0
    return Table(table.index, t_map).compress()


def merge_table(lhs: Table, rhs: Table):
    lhs, rhs = align_tables(lhs, rhs)

    # Merge the indices
    lhs.index.update(rhs.index)

    # Merge the maps
    msk = rhs.map.values != 0
    lhs.map.values[msk] = rhs.map.values[msk]

    return lhs.compress()


def slice_table(table: Table, mask: Map):
    t_map, m_map = align_maps(table.map, mask)
    t_map.values[m_map.values == 0] = 0
    return Table(table.index, t_map).compress()


def write_table(table: Table, mask: Map, value: Any):
    # Extend the index to include the new value.
    key = max(key for key in list(table.index) + [0]) + 1
    index = table.index.copy()
    index[key] = value

    # Update the table map to include the new value.
    t_map, m_map = align_maps(table.map, mask)
    t_map.values[m_map.values] = key
    return Table(index, t_map).compress()

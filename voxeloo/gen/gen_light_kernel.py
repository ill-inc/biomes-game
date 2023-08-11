#!/usr/bin/env python3

import os
import subprocess
import sys
from dataclasses import dataclass
from functools import lru_cache
from string import Template
from typing import Dict, Optional, Tuple, Union

import numpy as np


@dataclass
class Transform:
    reflect: Tuple[bool, bool, bool]
    permute: Tuple[int, int, int]

    def identity(self):
        return self.reflect == [0, 0, 0] and self.permute == [0, 1, 2]

    def inverse(self):
        pz, py, px = [
            self.permute.index(0),
            self.permute.index(1),
            self.permute.index(2),
        ]
        return Transform(
            reflect=[self.reflect[pz], self.reflect[py], self.reflect[px]],
            permute=[pz, py, px],
        )

    def apply(self, mask: np.ndarray):
        mask = np.transpose(mask, self.permute)
        mask = np.flip(mask, np.where(self.reflect)[0])
        return mask


def key_to_mask(key: int):
    return np.unpackbits(np.array([key], dtype=np.uint8)).reshape(2, 2, 2)


def mask_to_key(mask: np.ndarray):
    return np.packbits(mask)[0]


class UnionFind:
    def __init__(self, n):
        self.parents = {i: i for i in range(n)}

    def union(self, i: int, j: int):
        self.parents[self.find(j)] = self.find(i)

    def find(self, i):
        return i if self.parents[i] == i else self.find(self.parents[i])

    def components(self):
        ret = {}
        for i in self.parents:
            ret.setdefault(self.find(i), []).append(i)
        return list(ret.values())


@lru_cache
def get_permutations():
    return [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
    ]


@lru_cache
def get_reflections():
    return [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
    ]


@lru_cache
def get_transforms():
    transforms = []
    for pz, py, px in get_permutations():
        for rz, ry, rx in get_reflections():
            transforms.append(
                Transform(
                    reflect=[bool(rz), bool(ry), bool(rx)],
                    permute=[pz, py, px],
                )
            )
    return transforms


@lru_cache
def get_masks():
    return [key_to_mask(i) for i in range(256)]


@lru_cache
def get_isomorphisms():
    iso_map = {}

    group = 0
    for mask in get_masks():
        if mask_to_key(mask) in iso_map:
            continue
        for transform in get_transforms():
            iso = transform.apply(mask)
            key = mask_to_key(iso)
            if key not in iso_map:
                iso_map[key] = (group, transform)
        group += 1

    return iso_map


@lru_cache
def get_groups():
    groups = {}
    for key, iso in sorted(get_isomorphisms().items()):
        if iso[0] not in groups:
            assert iso[1].identity()
            groups[iso[0]] = key_to_mask(key)
    return groups


def mask_components(mask):
    key = lambda x, y, z: x + 2 * (y + 2 * z)
    uf = UnionFind(8)
    for z in [0, 1]:
        for y in [0, 1]:
            for x in [0, 1]:
                if mask[z, y, x]:
                    i = key(x, y, z)
                    if mask[z, y, 1 - x]:
                        uf.union(i, key(1 - x, y, z))
                    if mask[z, 1 - y, x]:
                        uf.union(i, key(x, 1 - y, z))
                    if mask[1 - z, y, x]:
                        uf.union(i, key(x, y, 1 - z))
    return uf.components()


def group_code(mask):
    zyx = lambda i: (
        (i // 4) % 2,
        (i // 2) % 2,
        (i // 1) % 2,
    )

    code = []
    component_count = 0
    for component in mask_components(mask):
        if not mask[zyx(component[0])]:
            continue

        sum_code = []
        for j in component:
            sum_code.append(f"sum += samples[{j}];")

        set_code = []
        for j in component:
            dz, dy, dx = zyx(j)
            set_code.append(f"out.set({{{dx}, {dy}, {dz}}}, value);")

        code.append(
            Template(
                """
                // Emit component $component
                {
                    Vec3f sum{0.0, 0.0, 0.0};
                    $sum_code

                    // Quantize the vertex light value.
                    auto value = quantize_light_value(sum / 8.0f);

                    // Emit the final quantized light value for each corner.
                    $set_code
                }
                """
            )
            .substitute(
                component=component_count,
                sum_code="\n".join(sum_code),
                set_code="\n".join(set_code),
            )
            .strip()
        )
        component_count += 1
    return "\n".join(code)


def groups_code():
    case_code = []
    for group, mask in sorted(get_groups().items()):
        label = format(mask_to_key(mask), "08b")
        case_code.append(f"case {group} /* {label} */:")
        case_code.append(group_code(mask))
        case_code.append("break;")

    case_code = [line for line in case_code if line.strip()]
    return Template(
        """
        inline auto quantize_light_value(Vec3f value) {
            return (15.0f * clamp(value, 0.0f, 1.0f) + Vec3f{0.5, 0.5, 0.5}).to<uint32_t>();
        }

        template <typename LightMask>
        inline auto group_mask(const std::array<Vec3f, 8>& samples, int group) {
            LightMask out;
            switch (group) {
                $case_code
                default:
                CHECK_UNREACHABLE("Invalid isomorphism group");
            }
            return out;
         }
         """
    ).substitute(
        case_code="\n".join(case_code),
    )


def isomorphism_code():
    iso_map = get_isomorphisms()

    entry_code = []
    for _, (group, _) in sorted(iso_map.items()):
        entry_code.append(f"{group},")

    return (
        Template(
            """
        static const std::array<int, $len> kMaskToGroupLut = {
            $entry
        };
        """
        )
        .substitute(
            len=len(iso_map),
            entry="\n".join(entry_code),
        )
        .strip()
    )


def permute_samples_code():
    case_code = []
    for i, permute in enumerate(get_permutations()):
        case_code.append(f"case {i} /* {permute} */:")
        index = np.transpose(np.arange(8).reshape(2, 2, 2), permute)
        for i, j in enumerate(index.flatten().tolist()):
            if i != j:
                case_code.append(f"out[{i}] = samples[{j}];")
        case_code.append("break;")

    return Template(
        """
        inline auto permute_samples(
            const std::array<Vec3f, 8>& samples, int permute) {
            std::array<Vec3f, 8> out = samples;
            switch (permute) {
                $case_code
                default:
                CHECK_UNREACHABLE("Invalid permutation");
            }
            return out;
         }
         """
    ).substitute(
        case_code="\n".join(case_code),
    )


def reflect_samples_code():
    case_code = []
    for i, reflect in enumerate(get_reflections()):
        case_code.append(f"case {i} /* {reflect} */:")
        index = np.flip(np.arange(8).reshape(2, 2, 2), np.where(reflect)[0])
        for i, j in enumerate(index.flatten().tolist()):
            if i != j:
                case_code.append(f"out[{i}] = samples[{j}];")
        case_code.append("break;")

    return Template(
        """
        inline auto reflect_samples(
            const std::array<Vec3f, 8>& samples, int reflect) {
            std::array<Vec3f, 8> out = samples;
            switch (reflect) {
                $case_code
                default:
                CHECK_UNREACHABLE("Invalid reflection");
            }
            return out;
         }
         """
    ).substitute(
        case_code="\n".join(case_code),
    )


def transform_samples_code():
    iso_map = get_isomorphisms()

    permute_index = {}
    for i, permute in enumerate(get_permutations()):
        permute_index[tuple(permute)] = i

    reflect_index = {}
    for i, reflect in enumerate(get_reflections()):
        reflect_index[tuple(reflect)] = i

    permute_code = []
    reflect_code = []
    for key, (_, transform) in sorted(iso_map.items()):
        transform = transform.inverse()
        permute_code.append(f"{permute_index[tuple(transform.permute)]},")
        reflect_code.append(f"{reflect_index[tuple(transform.reflect)]},")

    return (
        Template(
            """
        static const std::array<int, $len> kSamplesPermuteLut = {
            $permute_code
        };

        static const std::array<int, $len> kSamplesReflectLut = {
            $reflect_code
        };

        inline auto transform_samples(
            const std::array<Vec3f, 8>& samples, uint8_t occlusion_mask) {
            auto permute = kSamplesPermuteLut[occlusion_mask];
            auto reflect = kSamplesReflectLut[occlusion_mask];
            return reflect_samples(permute_samples(samples, permute), reflect);
        }
        """
        )
        .substitute(
            len=len(iso_map),
            permute_code="\n".join(permute_code),
            reflect_code="\n".join(reflect_code),
        )
        .strip()
    )


def permute_mask_code():
    zyx = lambda i: (
        (i // 4) % 2,
        (i // 2) % 2,
        (i // 1) % 2,
    )

    case_code = []
    for i, permute in enumerate(get_permutations()):
        case_code.append(f"case {i} /* {permute} */:")
        index = np.transpose(np.arange(8).reshape(2, 2, 2), permute)
        for i, j in enumerate(index.flatten().tolist()):
            if i != j:
                iz, iy, ix = zyx(i)
                jz, jy, jx = zyx(j)
                case_code.append(
                    f"out.set({{{ix}, {iy}, {iz}}}, mask.get({{{jx}, {jy}, {jz}}}));"
                )
        case_code.append("break;")

    return Template(
        """
        template <typename LightMask>
        inline auto permute_mask(LightMask mask, int permute) {
            LightMask out = mask;
            switch (permute) {
                $case_code
                default:
                CHECK_UNREACHABLE("Invalid permutation");
            }
            return out;
         }
         """
    ).substitute(
        case_code="\n".join(case_code),
    )


def reflect_mask_code():
    zyx = lambda i: (
        (i // 4) % 2,
        (i // 2) % 2,
        (i // 1) % 2,
    )

    case_code = []
    for i, reflect in enumerate(get_reflections()):
        case_code.append(f"case {i} /* {reflect} */:")
        index = np.flip(np.arange(8).reshape(2, 2, 2), np.where(reflect)[0])
        for i, j in enumerate(index.flatten().tolist()):
            if i != j:
                iz, iy, ix = zyx(i)
                jz, jy, jx = zyx(j)
                case_code.append(
                    f"out.set({{{ix}, {iy}, {iz}}}, mask.get({{{jx}, {jy}, {jz}}}));"
                )
        case_code.append("break;")

    return Template(
        """
        template <typename LightMask>
        inline auto reflect_mask(LightMask mask, int reflect) {
            LightMask out = mask;
            switch (reflect) {
                $case_code
                default:
                CHECK_UNREACHABLE("Invalid reflection");
            }
            return out;
         }
         """
    ).substitute(
        case_code="\n".join(case_code),
    )


def transform_mask_code():
    iso_map = get_isomorphisms()

    permute_index = {}
    for i, permute in enumerate(get_permutations()):
        permute_index[tuple(permute)] = i

    reflect_index = {}
    for i, reflect in enumerate(get_reflections()):
        reflect_index[tuple(reflect)] = i

    permute_code = []
    reflect_code = []
    for _, (_, transform) in sorted(iso_map.items()):
        permute_code.append(f"{permute_index[tuple(transform.permute)]},")
        reflect_code.append(f"{reflect_index[tuple(transform.reflect)]},")

    return (
        Template(
            """
        static const std::array<int, $len> kMaskPermuteLut = {
            $permute_code
        };

        static const std::array<int, $len> kMaskReflectLut = {
            $reflect_code
        };

        template <typename LightMask>
        inline auto transform_mask(LightMask out, uint8_t occlusion_mask) {
            auto permute = kMaskPermuteLut[occlusion_mask];
            auto reflect = kMaskReflectLut[occlusion_mask];
            return reflect_mask(permute_mask(out, permute), reflect);
        }
        """
        )
        .substitute(
            len=len(iso_map),
            permute_code="\n".join(permute_code),
            reflect_code="\n".join(reflect_code),
        )
        .strip()
    )


def hpp_code():
    return Template(
        """#pragma once

        #include <algorithm>
        #include <array>

        #include "voxeloo/common/errors.hpp"
        #include "voxeloo/common/geometry.hpp"

        namespace voxeloo::galois::lighting {

        $isomorphism_code

        $groups_code

        $permute_samples_code

        $reflect_samples_code

        $transform_samples_code

        $permute_mask_code

        $reflect_mask_code

        $transform_mask_code

        template <typename LightMask>
        inline auto apply_light_kernel_with_occlusion(
            uint8_t occlusion_mask,
            const std::array<Vec3f, 8>& samples
        ) {
            // Transform the samples to the group version.
            auto group_samples = transform_samples(samples, occlusion_mask);

            // Get the light mask for the occlusion mask's isomorphism group.
            auto group = kMaskToGroupLut[occlusion_mask];
            auto light_mask = group_mask<LightMask>(group_samples, group);

            // Transform the light mask to the final output.
            return transform_mask<LightMask>(light_mask, occlusion_mask);
        }

        template <typename LightMask>
        inline auto apply_light_kernel(
            const std::array<Vec3f, 8>& samples
        ) {
            Vec3f sum{0.0, 0.0, 0.0};
            for (auto sample : samples) {
                sum += sample;
            }

            // Quantize the vertex light value.
            auto value = quantize_light_value(sum / 8.0f);

            // Write the output to each corner.
            LightMask out;
            for (auto dz : {0u, 1u}) {
                for (auto dy : {0u, 1u}) {
                    for (auto dx : {0u, 1u}) {
                        out.set({dx, dy, dz}, value);
                    }
                }
            }
            return out;
        }

        }
        """
    ).substitute(
        isomorphism_code=isomorphism_code(),
        groups_code=groups_code(),
        permute_samples_code=permute_samples_code(),
        reflect_samples_code=reflect_samples_code(),
        transform_samples_code=transform_samples_code(),
        permute_mask_code=permute_mask_code(),
        reflect_mask_code=reflect_mask_code(),
        transform_mask_code=transform_mask_code(),
    )


def dump_code(out_file, out_code):
    with open(out_file, "w") as f:
        f.write(out_code)

    # Auto-format output
    clang_format = (
        os.environ["CLANG_FORMAT"]
        if "CLANG_FORMAT" in os.environ
        else "clang-format"
    )
    subprocess.run([clang_format, "-i", out_file])


def gen_cpp():
    assert len(sys.argv) == 2
    dump_code(
        out_file=sys.argv[1],
        out_code=hpp_code(),
    )


if __name__ == "__main__":
    gen_cpp()

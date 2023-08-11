#!/usr/bin/env python3

import itertools
import os
import subprocess
import sys
from collections import OrderedDict
from dataclasses import dataclass
from typing import Dict, Optional, Union

from jinja2 import Environment, FileSystemLoader


def clean_code(impl):
    lines = impl.strip().split("\n")
    if len(lines) > 1:
        space = min(len(line) - len(line.lstrip()) for line in lines[1:])
        lines[1:] = [line[space:] for line in lines[1:]]
    return "\n".join([line.rstrip() for line in lines])


def format_param(name, kind):
    if isinstance(kind, ValueType):
        return f"{kind.name} {name}"
    else:
        return f"const {kind.name}& {name}"


def format_slices(coords, r):
    return ["".join(pi) for pi in itertools.permutations(coords, r)]


@dataclass
class ValueType:
    name: str
    abbr: Optional[str] = None


@dataclass
class ArrayType:
    name: str


@dataclass
class Op:
    name: str
    args: Dict[str, Union[ArrayType, ValueType]]
    impl: str
    ret: ArrayType

    def __post_init__(self):
        self.impl = clean_code(self.impl)

    def arguments(self):
        return ", ".join([format_param(k, v) for k, v in self.args.items()])

    def is_dim(self):
        return any([arg == VecX for arg in self.args.values()])

    def is_fix(self):
        return not self.is_dim()


@dataclass
class Inplace:
    name: str
    to: ArrayType
    args: Dict[str, Union[ArrayType, ValueType]]
    impl: str

    def __post_init__(self):
        self.impl = clean_code(self.impl)

    def arguments(self):
        return ", ".join([format_param(k, v) for k, v in self.args.items()])


# Define the value types.
T = ValueType(name="T")
Int = ValueType(name="int", abbr="i")
Float = ValueType(name="float", abbr="f")
Double = ValueType(name="double", abbr="d")
Unsigned = ValueType(name="unsigned int", abbr="u")
Bool = ValueType(name="bool", abbr="b")

# Define the generic array types.
Vec2 = ArrayType(name="Vec2<T>")
Vec3 = ArrayType(name="Vec3<T>")
Vec4 = ArrayType(name="Vec4<T>")
VecX = ArrayType(name="Vec<T, dim>")

# Define the static array types.
Vec2i = ArrayType(name="Vec2<int>")
Vec3i = ArrayType(name="Vec3<int>")
Vec4i = ArrayType(name="Vec4<int>")
Vec2f = ArrayType(name="Vec2<float>")
Vec3f = ArrayType(name="Vec3<float>")
Vec4f = ArrayType(name="Vec4<float>")
Vec2d = ArrayType(name="Vec2<double>")
Vec3d = ArrayType(name="Vec3<double>")
Vec4d = ArrayType(name="Vec4<double>")

vec2_slices = []
vec3_slices = []
vec4_slices = []
ops = []

# Slicing routines
for pi in format_slices("xy", 2):
    vec2_slices.append(
        Inplace(
            name=pi,
            to=Vec2,
            args=OrderedDict(),
            impl=f"return Vec2<T>({pi[0]}, {pi[1]});",
        )
    )
for pi in format_slices("xyz", 2):
    vec3_slices.append(
        Inplace(
            name=pi,
            to=Vec2,
            args=OrderedDict(),
            impl=f"return Vec2<T>({pi[0]}, {pi[1]});",
        )
    )
for pi in format_slices("xyz", 3):
    vec3_slices.append(
        Inplace(
            name=pi,
            to=Vec3,
            args=OrderedDict(),
            impl=f"return Vec3<T>({pi[0]}, {pi[1]}, {pi[2]});",
        )
    )
for pi in format_slices("xyzw", 2):
    vec4_slices.append(
        Inplace(
            name=pi,
            to=Vec2,
            args=OrderedDict(),
            impl=f"return Vec2<T>({pi[0]}, {pi[1]});",
        )
    )
for pi in format_slices("xyzw", 3):
    vec4_slices.append(
        Inplace(
            name=pi,
            to=Vec3,
            args=OrderedDict(),
            impl=f"return Vec3<T>({pi[0]}, {pi[1]}, {pi[2]});",
        )
    )
for pi in format_slices("xyzw", 4):
    vec4_slices.append(
        Inplace(
            name=pi,
            to=Vec4,
            args=OrderedDict(),
            impl=f"return Vec4<T>({pi[0]}, {pi[1]}, {pi[2]}, {pi[3]});",
        )
    )

# Scalar inplace operations
for symbol in ["+", "-", "*", "/", "%", "|", "&", "^", "<<", ">>"]:
    ops.extend(
        [
            Inplace(
                name=f"operator{symbol}=",
                to=Vec2,
                args=OrderedDict(s=T),
                impl=f"""
                x {symbol}= s;
                y {symbol}= s;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=Vec3,
                args=OrderedDict(s=T),
                impl=f"""
                x {symbol}= s;
                y {symbol}= s;
                z {symbol}= s;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=Vec4,
                args=OrderedDict(s=T),
                impl=f"""
                x {symbol}= s;
                y {symbol}= s;
                z {symbol}= s;
                w {symbol}= s;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=VecX,
                args=OrderedDict(s=T),
                impl=f"""
                for (size_t i = 0; i < dim; i += 1) {{
                  data[i] {symbol}= s;
                }}
            """,
            ),
        ]
    )

# Vector inplace operations
for symbol in ["+", "-", "*", "/", "%", "|"]:
    ops.extend(
        [
            Inplace(
                name=f"operator{symbol}=",
                to=Vec2,
                args=OrderedDict(v=Vec2),
                impl=f"""
                x {symbol}= v.x;
                y {symbol}= v.y;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=Vec3,
                args=OrderedDict(v=Vec3),
                impl=f"""
                x {symbol}= v.x;
                y {symbol}= v.y;
                z {symbol}= v.z;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=Vec4,
                args=OrderedDict(v=Vec4),
                impl=f"""
                x {symbol}= v.x;
                y {symbol}= v.y;
                z {symbol}= v.z;
                w {symbol}= v.w;
            """,
            ),
            Inplace(
                name=f"operator{symbol}=",
                to=VecX,
                args=OrderedDict(v=VecX),
                impl=f"""
                for (size_t i = 0; i < dim; i += 1) {{
                  data[i] {symbol}= v[i];
                }}
            """,
            ),
        ]
    )

# Unary operations
for symbol in ["-", "~"]:
    ops.extend(
        [
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec2),
                ret=Vec2,
                impl=f"return Vec2<T>({symbol}v.x, {symbol}v.y);",
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec3),
                ret=Vec3,
                impl=f"return Vec3<T>({symbol}v.x, {symbol}v.y, {symbol}v.z);",
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec4),
                ret=Vec4,
                impl=f"return Vec4<T>({symbol}v.x, {symbol}v.y, {symbol}v.z, {symbol}v.w);",
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                ret[i] = {symbol}v[i];
                }}
                return ret;
            """,
            ),
        ]
    )

# Left-scalar binary operations.
for symbol in ["+", "-", "*", "/", "%", "|", "&", "^", "<<", ">>"]:
    ops.extend(
        [
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(s=T, v=Vec2),
                ret=Vec2,
                impl=f"""
                auto x = s {symbol} v.x;
                auto y = s {symbol} v.y;
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(s=T, v=Vec3),
                ret=Vec3,
                impl=f"""
                auto x = s {symbol} v.x;
                auto y = s {symbol} v.y;
                auto z = s {symbol} v.z;
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(s=T, v=Vec4),
                ret=Vec4,
                impl=f"""
                auto x = s {symbol} v.x;
                auto y = s {symbol} v.y;
                auto z = s {symbol} v.z;
                auto w = s {symbol} v.w;
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(s=T, v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = s {symbol} v[i];
                }}
                return ret;
            """,
            ),
        ]
    )

# Right-scalar binary operations.
for symbol in ["+", "-", "*", "/", "%", "|", "&", "^", "<<", ">>"]:
    ops.extend(
        [
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec2, s=T),
                ret=Vec2,
                impl=f"""
                auto x = v.x {symbol} s;
                auto y = v.y {symbol} s;
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec3, s=T),
                ret=Vec3,
                impl=f"""
                auto x = v.x {symbol} s;
                auto y = v.y {symbol} s;
                auto z = v.z {symbol} s;
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=Vec4, s=T),
                ret=Vec4,
                impl=f"""
                auto x = v.x {symbol} s;
                auto y = v.y {symbol} s;
                auto z = v.z {symbol} s;
                auto w = v.w {symbol} s;
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(v=VecX, s=T),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = v[i] {symbol} s;
                }}
                return ret;
            """,
            ),
        ]
    )

# Vector binary operations.
for symbol in ["+", "-", "*", "/", "%"]:
    ops.extend(
        [
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(u=Vec2, v=Vec2),
                ret=Vec2,
                impl=f"""
                auto x = u.x {symbol} v.x;
                auto y = u.y {symbol} v.y;
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(u=Vec3, v=Vec3),
                ret=Vec3,
                impl=f"""
                auto x = u.x {symbol} v.x;
                auto y = u.y {symbol} v.y;
                auto z = u.z {symbol} v.z;
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(u=Vec4, v=Vec4),
                ret=Vec4,
                impl=f"""
                auto x = u.x {symbol} v.x;
                auto y = u.y {symbol} v.y;
                auto z = u.z {symbol} v.z;
                auto w = u.w {symbol} v.w;
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=f"operator{symbol}",
                args=OrderedDict(u=VecX, v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = u[i] {symbol} v[i];
                }}
                return ret;
            """,
            ),
        ]
    )

# Left-scalar binary functions.
for fn in ["min", "max"]:
    ops.extend(
        [
            Op(
                name=fn,
                args=OrderedDict(s=T, v=Vec2),
                ret=Vec2,
                impl=f"""
                auto x = std::{fn}(s, v.x);
                auto y = std::{fn}(s, v.y);
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(s=T, v=Vec3),
                ret=Vec3,
                impl=f"""
                auto x = std::{fn}(s, v.x);
                auto y = std::{fn}(s, v.y);
                auto z = std::{fn}(s, v.z);
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(s=T, v=Vec4),
                ret=Vec4,
                impl=f"""
                auto x = std::{fn}(s, v.x);
                auto y = std::{fn}(s, v.y);
                auto z = std::{fn}(s, v.z);
                auto w = std::{fn}(s, v.w);
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(s=T, v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = std::{fn}(s, v[i]);
                }}
                return ret;
            """,
            ),
        ]
    )

# Right-scalar binary functions.
for fn in ["min", "max"]:
    ops.extend(
        [
            Op(
                name=fn,
                args=OrderedDict(v=Vec2, s=T),
                ret=Vec2,
                impl=f"""
                auto x = std::{fn}(v.x, s);
                auto y = std::{fn}(v.y, s);
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=Vec3, s=T),
                ret=Vec3,
                impl=f"""
                auto x = std::{fn}(v.x, s);
                auto y = std::{fn}(v.y, s);
                auto z = std::{fn}(v.z, s);
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=Vec4, s=T),
                ret=Vec4,
                impl=f"""
                auto x = std::{fn}(v.x, s);
                auto y = std::{fn}(v.y, s);
                auto z = std::{fn}(v.z, s);
                auto w = std::{fn}(v.w, s);
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=VecX, s=T),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = std::{fn}(v[i], s);
                }}
                return ret;
            """,
            ),
        ]
    )

# Vector binary functions.
for fn in ["min", "max"]:
    ops.extend(
        [
            Op(
                name=fn,
                args=OrderedDict(u=Vec2, v=Vec2),
                ret=Vec2,
                impl=f"""
                auto x = std::{fn}(u.x, v.x);
                auto y = std::{fn}(u.y, v.y);
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(u=Vec3, v=Vec3),
                ret=Vec3,
                impl=f"""
                auto x = std::{fn}(u.x, v.x);
                auto y = std::{fn}(u.y, v.y);
                auto z = std::{fn}(u.z, v.z);
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(u=Vec4, v=Vec4),
                ret=Vec4,
                impl=f"""
                auto x = std::{fn}(u.x, v.x);
                auto y = std::{fn}(u.y, v.y);
                auto z = std::{fn}(u.z, v.z);
                auto w = std::{fn}(u.w, v.w);
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(u=VecX, v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = std::{fn}(u[i], v[i]);
                }}
                return ret;
            """,
            ),
        ]
    )

# Boolean operations
ops.extend(
    [
        Op(
            name="operator==",
            args=OrderedDict(u=Vec2, v=Vec2),
            ret=Bool,
            impl="return u.x == v.x && u.y == v.y;",
        ),
        Op(
            name="operator==",
            args=OrderedDict(u=Vec3, v=Vec3),
            ret=Bool,
            impl="return u.x == v.x && u.y == v.y && u.z == v.z;",
        ),
        Op(
            name=f"operator==",
            args=OrderedDict(u=Vec4, v=Vec4),
            ret=Bool,
            impl="return u.x == v.x && u.y == v.y && u.z == v.z && u.w == v.w;",
        ),
        Op(
            name=f"operator==",
            args=OrderedDict(u=VecX, v=VecX),
            ret=Bool,
            impl="""
           for (size_t i = 0; i < dim; i += 1) {
             if (u[i] != v[i]) {
               return false;
             }
           }
           return true;
       """,
        ),
        Op(
            name="operator!=",
            args=OrderedDict(u=Vec2, v=Vec2),
            ret=Bool,
            impl="return u.x != v.x || u.y != v.y;",
        ),
        Op(
            name="operator!=",
            args=OrderedDict(u=Vec3, v=Vec3),
            ret=Bool,
            impl="return u.x != v.x || u.y != v.y || u.z != v.z;",
        ),
        Op(
            name=f"operator!=",
            args=OrderedDict(u=Vec4, v=Vec4),
            ret=Bool,
            impl="return u.x != v.x || u.y != v.y || u.z != v.z || u.w != v.w;",
        ),
        Op(
            name=f"operator!=",
            args=OrderedDict(u=VecX, v=VecX),
            ret=Bool,
            impl="""
           for (size_t i = 0; i < dim; i += 1) {
             if (u[i] != v[i]) {
               return true;
             }
           }
           return false;
       """,
        ),
    ]
)

# Clamp function
ops.extend(
    [
        Op(
            name="clamp",
            args=OrderedDict(v=Vec2, lo=T, hi=T),
            ret=Vec2,
            impl="""
            auto x = std::clamp(v.x, lo, hi);
            auto y = std::clamp(v.y, lo, hi);
            return Vec2<T>(x, y);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=Vec3, lo=T, hi=T),
            ret=Vec3,
            impl="""
            auto x = std::clamp(v.x, lo, hi);
            auto y = std::clamp(v.y, lo, hi);
            auto z = std::clamp(v.z, lo, hi);
            return Vec3<T>(x, y, z);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=Vec4, lo=T, hi=T),
            ret=Vec4,
            impl="""
            auto x = std::clamp(v.x, lo, hi);
            auto y = std::clamp(v.y, lo, hi);
            auto z = std::clamp(v.z, lo, hi);
            auto w = std::clamp(v.w, lo, hi);
            return Vec4<T>(x, y, z, w);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=VecX, lo=T, hi=T),
            ret=VecX,
            impl=f"""
            Vec<T, dim> ret;
            for (size_t i = 0; i < dim; i += 1) {{
                ret[i] = std::clamp(v[i], lo, hi);
            }}
            return ret;
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=Vec2, lo=Vec2, hi=Vec2),
            ret=Vec2,
            impl="""
            auto x = std::clamp(v.x, lo.x, hi.x);
            auto y = std::clamp(v.y, lo.y, hi.y);
            return Vec2<T>(x, y);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=Vec3, lo=Vec3, hi=Vec3),
            ret=Vec3,
            impl="""
            auto x = std::clamp(v.x, lo.x, hi.x);
            auto y = std::clamp(v.y, lo.y, hi.y);
            auto z = std::clamp(v.z, lo.z, hi.z);
            return Vec3<T>(x, y, z);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=Vec4, lo=Vec4, hi=Vec4),
            ret=Vec4,
            impl="""
            auto x = std::clamp(v.x, lo.x, hi.x);
            auto y = std::clamp(v.y, lo.y, hi.y);
            auto z = std::clamp(v.z, lo.z, hi.z);
            auto w = std::clamp(v.w, lo.w, hi.w);
            return Vec4<T>(x, y, z, w);
        """,
        ),
        Op(
            name="clamp",
            args=OrderedDict(v=VecX, lo=VecX, hi=VecX),
            ret=VecX,
            impl=f"""
            Vec<T, dim> ret;
            for (size_t i = 0; i < dim; i += 1) {{
                ret[i] = std::clamp(v[i], lo[i], hi[i]);
            }}
            return ret;
        """,
        ),
    ]
)

# Dot product
ops.extend(
    [
        Op(
            name="dot",
            args=OrderedDict(u=Vec2, v=Vec2),
            ret=T,
            impl="return u.x * v.x + u.y * v.y;",
        ),
        Op(
            name="dot",
            args=OrderedDict(u=Vec3, v=Vec3),
            ret=T,
            impl="return u.x * v.x + u.y * v.y + u.z * v.z;",
        ),
        Op(
            name="dot",
            args=OrderedDict(u=Vec4, v=Vec4),
            ret=T,
            impl="return u.x * v.x + u.y * v.y + u.z * v.z + u.w * v.w;",
        ),
        Op(
            name="dot",
            args=OrderedDict(u=VecX, v=VecX),
            ret=T,
            impl=f"""
            T ret = u[0] * v[0];
            for (size_t i = 1; i < dim; i += 1) {{
                ret += u[i] * v[i];
            }}
            return ret;
        """,
        ),
    ]
)

# Cross product
ops.append(
    Op(
        name="cross",
        args=OrderedDict(u=Vec3, v=Vec3),
        ret=Vec3,
        impl="""
            auto x = u.y * v.z - u.z * v.y;
            auto y = u.z * v.x - u.x * v.z;
            auto z = u.x * v.y - u.y * v.x;
            return Vec3<T>(x, y, z);
        """,
    )
)

# Interpolation functions
ops.extend(
    [
        Op(
            name="lerp",
            args=OrderedDict(u=Vec2, v=Vec2, t=T),
            ret=Vec2,
            impl="""
            auto x = u.x + t * (v.x - u.x);
            auto y = u.y + t * (v.y - u.y);
            return Vec2<T>(x, y);
        """,
        ),
        Op(
            name="lerp",
            args=OrderedDict(u=Vec3, v=Vec3, t=T),
            ret=Vec3,
            impl="""
            auto x = u.x + t * (v.x - u.x);
            auto y = u.y + t * (v.y - u.y);
            auto z = u.z + t * (v.z - u.z);
            return Vec3<T>(x, y, z);
        """,
        ),
        Op(
            name="lerp",
            args=OrderedDict(u=Vec4, v=Vec4, t=T),
            ret=Vec4,
            impl="""
            auto x = u.x + t * (v.x - u.x);
            auto y = u.y + t * (v.y - u.y);
            auto z = u.z + t * (v.z - u.z);
            auto w = u.w + t * (v.w - u.w);
            return Vec4<T>(x, y, z, w);
        """,
        ),
        Op(
            name="lerp",
            args=OrderedDict(u=VecX, v=VecX, t=T),
            ret=VecX,
            impl=f"""
            Vec<T, dim> ret;
            for (size_t i = 0; i < dim; i += 1) {{
              ret[i] = u[i] + t * (v[i] - u[i]);
            }}
            return ret;
        """,
        ),
    ]
)

# Reductions
ops.extend(
    [
        Op(
            name="sum",
            args=OrderedDict(v=Vec2),
            ret=T,
            impl="return v.x + v.y;",
        ),
        Op(
            name="sum",
            args=OrderedDict(v=Vec3),
            ret=T,
            impl="return v.x + v.y + v.z;",
        ),
        Op(
            name="sum",
            args=OrderedDict(v=Vec4),
            ret=T,
            impl="return v.x + v.y + v.z + v.w;",
        ),
        Op(
            name="sum",
            args=OrderedDict(v=VecX),
            ret=T,
            impl=f"""
            T ret = v[0];
            for (size_t i = 1; i < dim; i += 1) {{
              ret += v[i];
            }}
            return ret;
        """,
        ),
        Op(
            name="norm",
            args=OrderedDict(v=Vec2),
            ret=T,
            impl="return std::sqrt(dot(v, v));",
        ),
        Op(
            name="norm",
            args=OrderedDict(v=Vec3),
            ret=T,
            impl="return std::sqrt(dot(v, v));",
        ),
        Op(
            name="norm",
            args=OrderedDict(v=Vec4),
            ret=T,
            impl="return std::sqrt(dot(v, v));",
        ),
        Op(
            name="norm",
            args=OrderedDict(v=VecX),
            ret=T,
            impl="return std::sqrt(dot(v, v));",
        ),
        Op(
            name="square_norm",
            args=OrderedDict(v=Vec2),
            ret=T,
            impl="return dot(v, v);",
        ),
        Op(
            name="square_norm",
            args=OrderedDict(v=Vec3),
            ret=T,
            impl="return dot(v, v);",
        ),
        Op(
            name="square_norm",
            args=OrderedDict(v=Vec4),
            ret=T,
            impl="return dot(v, v);",
        ),
        Op(
            name="square_norm",
            args=OrderedDict(v=VecX),
            ret=T,
            impl="return dot(v, v);",
        ),
    ]
)

# Component-wise math functions
for fn in ["sin", "cos", "tan", "exp", "log", "sqrt", "abs", "floor", "ceil"]:
    ops.extend(
        [
            Op(
                name=fn,
                args=OrderedDict(v=Vec2),
                ret=Vec2,
                impl=f"""
                auto x = std::{fn}(v.x);
                auto y = std::{fn}(v.y);
                return Vec2<T>(x, y);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=Vec3),
                ret=Vec3,
                impl=f"""
                auto x = std::{fn}(v.x);
                auto y = std::{fn}(v.y);
                auto z = std::{fn}(v.z);
                return Vec3<T>(x, y, z);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=Vec4),
                ret=Vec4,
                impl=f"""
                auto x = std::{fn}(v.x);
                auto y = std::{fn}(v.y);
                auto z = std::{fn}(v.z);
                auto w = std::{fn}(v.w);
                return Vec4<T>(x, y, z, w);
            """,
            ),
            Op(
                name=fn,
                args=OrderedDict(v=VecX),
                ret=VecX,
                impl=f"""
                Vec<T, dim> ret;
                for (size_t i = 0; i < dim; i += 1) {{
                  ret[i] = std::{fn}(v[i]);
                }}
                return ret;
            """,
            ),
        ]
    )

# Component-wise square function
ops.extend(
    [
        Op(
            name="square",
            args=OrderedDict(v=Vec2),
            ret=Vec2,
            impl="return v * v;",
        ),
        Op(
            name="square",
            args=OrderedDict(v=Vec3),
            ret=Vec3,
            impl="return v * v;",
        ),
        Op(
            name="square",
            args=OrderedDict(v=Vec4),
            ret=Vec4,
            impl="return v * v;",
        ),
        Op(
            name="square",
            args=OrderedDict(v=VecX),
            ret=VecX,
            impl="return v * v;",
        ),
    ]
)

# Component-wise normalization function
ops.extend(
    [
        Op(
            name="normalized",
            args=OrderedDict(v=Vec2),
            ret=Vec2,
            impl="return v / norm(v);",
        ),
        Op(
            name="normalized",
            args=OrderedDict(v=Vec3),
            ret=Vec3,
            impl="return v / norm(v);",
        ),
        Op(
            name="normalized",
            args=OrderedDict(v=Vec4),
            ret=Vec4,
            impl="return v / norm(v);",
        ),
        Op(
            name="normalized",
            args=OrderedDict(v=VecX),
            ret=VecX,
            impl="return v / norm(v);",
        ),
    ]
)


def script_relative(path):
    return os.path.abspath(
        f"{os.path.dirname(os.path.abspath(__file__))}/{path}"
    )


def gen_cpp():
    assert len(sys.argv) == 2

    # Create the Jinja environment
    env = Environment(
        loader=FileSystemLoader(script_relative(".")),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    # Load and render the API template
    tmpl = env.get_template("geometry.hpp.j2")
    tmpl_out = tmpl.render(
        static_types=[Int, Float, Double, Bool, Unsigned],
        vec2_slices=vec2_slices,
        vec3_slices=vec3_slices,
        vec4_slices=vec4_slices,
        vec2_ops=[
            op for op in ops if isinstance(op, Inplace) and op.to == Vec2
        ],
        vec3_ops=[
            op for op in ops if isinstance(op, Inplace) and op.to == Vec3
        ],
        vec4_ops=[
            op for op in ops if isinstance(op, Inplace) and op.to == Vec4
        ],
        vec_ops=[op for op in ops if isinstance(op, Inplace) and op.to == VecX],
        general_ops=[op for op in ops if isinstance(op, Op)],
    )

    with open(sys.argv[1], "w") as out_file:
        out_file.write(tmpl_out)

    # Auto-format output
    clang_format = (
        os.environ["CLANG_FORMAT"]
        if "CLANG_FORMAT" in os.environ
        else "clang-format"
    )
    subprocess.run([clang_format, "-i", sys.argv[1]])


if __name__ == "__main__":
    gen_cpp()

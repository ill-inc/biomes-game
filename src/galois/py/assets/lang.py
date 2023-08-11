#!/usr/bin/env python

import hashlib
import re
from collections import OrderedDict
from dataclasses import dataclass, field
from functools import cached_property
from typing import Dict, List, Optional, Tuple, Union

RESERVED_NAMES = [
    "Node",
]


@dataclass
class TypeNode:
    kind: str
    subs: List["TypeNode"] = field(default_factory=list)
    data: Optional[str] = None
    name: Optional[str] = None

    def __post_init__(self):
        self.validate()

    def clone(self):
        return TypeNode(
            kind=self.kind,
            subs=self.subs,
            data=self.data,
            name=self.name,
        )

    def validate(self):
        for i, sub in enumerate(self.subs):
            if not isinstance(sub, TypeNode):
                if sub.__name__ == "type_guard":
                    name = getattr(sub, "__og_func__").__name__
                    raise ValueError(
                        f"Type '{self.kind}' has invalid child at pos: {i}. Missing parentheses around '{name}'?"
                    )
                else:
                    raise ValueError(
                        f"Type '{self.kind}' has invalid child at pos: {i}"
                    )
        for sub in self.subs:
            sub.validate()

    @cached_property
    def hash(self):
        ret = hashlib.sha256()
        if self.name:
            ret.update(self.name.encode("utf-8"))
        else:
            ret.update(self.kind.encode("utf-8"))
            for node in self.subs:
                ret.update(node.hash)
            if self.data:
                ret.update(self.data.encode("utf-8"))
        return ret.digest()


@dataclass
class TypeDef:
    name: str
    kind: str
    subs: List["TypeDef"]
    data: Optional[str]
    synthetic: bool

    def leaf(self):
        return len(self.subs) == 0

    @cached_property
    def rank(self):
        base = 0
        for sub in self.subs:
            base = max(base, sub.rank)
        return base + 1


def helper(fn):
    def type_guard(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            raise ValueError(str(e)) from None

    setattr(type_guard, "__og_func__", fn)
    return staticmethod(type_guard)


# Convenience routines for create type nodes.
class TypeHelpers:
    @helper
    def Null():
        return TypeNode(kind="Null", name="Null")

    @helper
    def Str():
        return TypeNode(kind="Str", name="Str")

    @helper
    def Bool():
        return TypeNode(kind="Bool", name="Bool")

    @helper
    def I8():
        return TypeNode(kind="I8", name="I8")

    @helper
    def I16():
        return TypeNode(kind="I16", name="I16")

    @helper
    def I32():
        return TypeNode(kind="I32", name="I32")

    @helper
    def I64():
        return TypeNode(kind="I64", name="I64")

    @helper
    def U8():
        return TypeNode(kind="U8", name="U8")

    @helper
    def U16():
        return TypeNode(kind="U16", name="U16")

    @helper
    def U32():
        return TypeNode(kind="U32", name="U32")

    @helper
    def U64():
        return TypeNode(kind="U64", name="U64")

    @helper
    def F32():
        return TypeNode(kind="F32", name="F32")

    @helper
    def F64():
        return TypeNode(kind="F64", name="F64")

    @helper
    def NumberLiteral(val: int):
        return TypeNode(kind="Literal", data=f"{val}")

    @helper
    def StringLiteral(val: str):
        return TypeNode(kind="Literal", data=f'"{val}"')

    @helper
    def Tuple(*args: TypeNode):
        assert len(args) >= 2
        try:
            return TypeNode(kind="Tuple", subs=args)
        except Exception as e:
            raise ValueError(str(e)) from None

    @helper
    def Union(*args: TypeNode):
        assert len(args) >= 2
        return TypeNode(kind="Union", subs=args)

    @helper
    def Enum(*options: str):
        return TypeHelpers.Union(
            *[TypeHelpers.StringLiteral(option) for option in options]
        )

    @helper
    def Array(type: TypeNode, size: int):
        return TypeHelpers.Tuple(*[type for _ in range(size)])

    @helper
    def List(arg: TypeNode):
        return TypeNode(kind="List", subs=[arg])

    @helper
    def Optional(type: TypeNode):
        return TypeHelpers.Union(type, TypeHelpers.Null())

    @helper
    def Dict(**kwargs: Dict[str, TypeNode]):
        return TypeHelpers.List(
            TypeHelpers.Union(
                *[
                    TypeHelpers.Tuple(TypeHelpers.StringLiteral(name), type)
                    for name, type in kwargs.items()
                ]
            )
        )

    @helper
    def External(name: str):
        return TypeNode(kind="External", name=name)

    @helper
    def Reference(name: str):
        return TypeNode(kind="Reference", name=name)


class TypeGenerator:
    def __init__(self):
        self.types = TypeHelpers
        self.nodes = {
            "Null": TypeHelpers.Null(),
            "Str": TypeHelpers.Str(),
            "Bool": TypeHelpers.Bool(),
            "I8": TypeHelpers.I8(),
            "I16": TypeHelpers.I16(),
            "I32": TypeHelpers.I32(),
            "I64": TypeHelpers.I64(),
            "U8": TypeHelpers.U8(),
            "U16": TypeHelpers.U16(),
            "U32": TypeHelpers.U32(),
            "U64": TypeHelpers.U64(),
            "F32": TypeHelpers.F32(),
            "F64": TypeHelpers.F64(),
        }

    def define(self, name: str, node: TypeNode, desc=""):
        if hasattr(self.types, name):
            raise ValueError(f"A type named '{name}' was already defined")
        if name in RESERVED_NAMES:
            raise ValueError(f"Illegal type name '{name}'")
        if node.kind == "Reference":
            raise ValueError(f"Cannot explicitly define a Reference `{name}`")
        setattr(self.types, name, lambda: node.clone())
        node.name = name
        self.nodes[name] = node
        return self

    def build(self):
        def __add_defs(defs, node: TypeNode):
            if node.hash in defs:
                return
            # Check for undefined references.
            if node.kind == "Reference":
                if node.name not in self.nodes:
                    raise ValueError(f'Undefined Reference("{name}").')
            for sub in node.subs:
                __add_defs(defs, sub)
            defs[node.hash] = TypeDef(
                name=node.name or f"T{len(defs)}",
                kind=node.kind,
                subs=[defs[sub.hash] for sub in node.subs],
                data=node.data,
                synthetic=node.name is None,
            )

        defs = {}
        for name, node in self.nodes.items():
            __add_defs(defs, node)

        return list(sorted(defs.values(), key=lambda d: d.rank))


@dataclass
class FuncDef:
    name: str
    args: Dict[str, str]
    type: str

    def fixed(self):
        return len(self.args) == 0

    def signature(self):
        if self.fixed():
            return self.name
        else:
            return f"{self.name}_{'_'.join(t for t in self.args.values())}"


@dataclass
class OverloadedFuncDef:
    name: str
    funcs: List[FuncDef]

    def __hash__(self):
        return hash(self.name)

    def __eq__(self, other):
        return self.name == other.name


class FuncGenerator:
    def __init__(self, types):
        self.types = set([t.name for t in types])
        self.funcs = {}

    def define(
        self, name: str, type: str, args: Dict[str, str], desc: str = ""
    ):
        # TODO: Add check for overloads that hide existing funcs
        if name in RESERVED_NAMES:
            raise ValueError(f"Illegal func name '{name}'")
        if name in self.types:
            raise ValueError(f"A type named '{name}' was already defined")
        for arg in args.values():
            if arg not in self.types:
                raise ValueError(f"Undefined argument type '{arg}'")
        if type not in self.types:
            raise ValueError(f"Undefined return type '{type}'")
        overloads = self.funcs.setdefault(name, OverloadedFuncDef(name, []))
        overloads.funcs.append(FuncDef(name=name, args=args, type=type))
        return self

    def build(self):
        return list(sorted(self.funcs.values(), key=lambda f: f.name))

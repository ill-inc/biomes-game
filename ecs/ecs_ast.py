#!/usr/bin/env python

import hashlib
import json
import re
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from functools import cached_property
from typing import (
    Dict,
    Iterable,
    List,
    Mapping,
    Optional,
    Set,
    Tuple,
    Type,
    TypeVar,
    Union,
)

T = TypeVar("T")


class AstConfig:
    def __init__(self, replacements: Mapping[Type, Type]):
        self.replacements = replacements

    def make(self, type_: Type[T], *args, **kwargs) -> T:
        ret = self.replacements.get(type_, type_)(*args, **kwargs)
        assert isinstance(ret, type_)
        return ret


@dataclass
class TypeNode:
    kind: str
    subs: Dict[Union[int, str], "TypeNode"] = field(default_factory=dict)
    name: Optional[str] = None
    enum: Union[None, List[str], List[int]] = None

    def __post_init__(self):
        self.validate()

    def validate(self):
        for key, sub in self.subs.items():
            if not isinstance(sub, TypeNode):
                if sub.__name__ == "type_guard":
                    name = getattr(sub, "__og_func__").__name__
                    raise ValueError(
                        f"Type '{self.kind}' has invalid child: {key}. Missing parentheses around '{name}'?"
                    )
                else:
                    raise ValueError(
                        f"Type '{self.kind}' has invalid child: {key}"
                    )
        for sub in self.subs.values():
            sub.validate()

    @cached_property
    def hash(self):
        ret = hashlib.sha256()
        if self.name:
            ret.update(self.name.encode("utf-8"))
        else:
            ret.update(self.kind.encode("utf-8"))
            for name, node in self.subs.items():
                ret.update(str(name).encode("utf-8"))
                ret.update(node.hash)
            for value in self.enum or []:
                ret.update(str(value).encode("utf-8"))
        return ret.digest()


@dataclass
class TypeDef:
    name: str
    kind: str
    subs: Dict[Union[int, str], "TypeDef"]
    synthetic: bool
    enum: Union[None, List[str], List[int]] = None
    external: bool = False

    @property
    def structured(self):
        return self.subs

    @cached_property
    def rank(self):
        base = 0
        for sub in self.subs.values():
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


EXTERNALLY_DEFINED_TYPES = {
    "BiomesId",
    "BiomesId",
    "ShardId",
    "Item",
    "ItemAndCount",
    "TriggerStateMap",
}


# Convenience routines for create type nodes.
class TypeHelpers:
    @helper
    def String():
        return TypeNode(kind="String", name="String")

    @helper
    def Bool():
        return TypeNode(kind="Bool", name="Bool")

    @helper
    def Buffer():
        return TypeNode(kind="Buffer", name="Buffer")

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
    def Enum(values: Iterable[str]):
        return TypeNode(kind="Enum", enum=[f'"{x}"' for x in values])

    @helper
    def Tuple(*args: TypeNode):
        try:
            return TypeNode(kind="Tuple", subs=dict(enumerate(args)))
        except Exception as e:
            raise ValueError(str(e)) from None

    @helper
    def Optional(arg: TypeNode):
        return TypeNode(kind="Optional", subs={0: arg})

    @helper
    def OneOf(**kwargs: TypeNode):
        return TypeNode(kind="OneOf", subs=kwargs)

    @helper
    def List(arg: TypeNode):
        return TypeNode(kind="List", subs={0: arg})

    @helper
    def Map(key: TypeNode, value: TypeNode):
        return TypeNode(kind="Map", subs={0: key, 1: value})

    @helper
    def Set(value: TypeNode):
        return TypeNode(kind="Set", subs={0: value})

    @helper
    def Dict(**kwargs: TypeNode):
        return TypeNode(kind="Dict", subs=kwargs)


class TypeGenerator:
    RESERVED_NAMES = [
        "Entity",
        "Component",
        "Selector",
        "Event",
    ]

    def __init__(self, ast_config: AstConfig):
        self.ast_config = ast_config
        self.types = TypeHelpers
        self.nodes = {
            "Buffer": TypeHelpers.Buffer(),
            "String": TypeHelpers.String(),
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
        for t in EXTERNALLY_DEFINED_TYPES:
            self.add_type(t, TypeNode(kind=t, name=t))

    def add_type(self, name: str, node: TypeNode):
        if hasattr(self.types, name):
            raise ValueError(f"A type named '{name}' was already defined")
        if name in TypeGenerator.RESERVED_NAMES:
            raise ValueError(f"Illegal type name '{name}'")
        setattr(self.types, name, lambda: node)
        node.name = name
        self.nodes[name] = node
        return self

    def build(self):
        def __add_defs(defs, node: TypeNode):
            if node.hash in defs:
                return
            for sub in node.subs.values():
                __add_defs(defs, sub)
            defs[node.hash] = self.ast_config.make(
                TypeDef,
                name=node.name or f"T{len(defs)}",
                kind=node.kind,
                subs={k: defs[v.hash] for k, v in node.subs.items()},
                enum=node.enum,
                synthetic=node.name is None,
                external=node.kind in EXTERNALLY_DEFINED_TYPES,
            )

        defs = {}
        for name, node in self.nodes.items():
            __add_defs(defs, node)

        return list(sorted(defs.values(), key=lambda d: d.rank))


class ComponentVisibility(str, Enum):
    # Visible to everyone in all contexts
    EVERYONE = "everyone"
    # Only visible on the server
    SERVER = "server"
    # Only visible to 'self', i.e. client with same entity ID
    SELF = "self"


@dataclass
class FieldDef:
    name: str
    kind: TypeDef


@dataclass
class Component:
    id: int
    name: str
    visibility: ComponentVisibility
    fields: List[Tuple[int, FieldDef]]
    hfc: bool

    def __post_init__(self):
        assert self.prop_name not in ["id", "entity", "clone"]
        assert self.type_name not in [
            "Entity",
            "Component",
            "Selector",
            "Event",
        ]

    def __hash__(self):
        return hash(self.name)

    def __eq__(self, other):
        return self.name == other.name

    @property
    def type_name(self):
        return self.name

    @property
    def prop_name(self):
        return re.sub(r"(?<!^)(?=[A-Z])", "_", self.name).lower()

    def ts_name(self):
        return self.name[0].lower() + self.name[1:]


class IndexType(str, Enum):
    SIMPLE = "simple"
    SPATIAL = "spatial"


@dataclass
class Selector:
    name: str
    components: List[Component]
    index_type: IndexType

    def __post_init__(self):
        if self.index_type == IndexType.SPATIAL:
            assert {"position", "box"} & self.component_prop_names

    @property
    def component_prop_names(self):
        return {c.prop_name for c in self.components}

    @property
    def prop_name(self):
        return re.sub(r"(?<!^)(?=[A-Z])", "_", self.name).lower()

    def matches(self, other: Union["Selector", "Entity"]) -> bool:
        return set(self.components).issubset(other.components)


@dataclass
class Entity:
    name: str
    components: List[Component]


@dataclass
class Event:
    name: str
    fields: List[Tuple[str, TypeDef]]

    @property
    def ts_name(self):
        return self.name[0].lower() + self.name[1:]

    def __post_init__(self):
        assert set(field[0] for field in self.fields).isdisjoint(["kind"])


@dataclass
class Defs:
    deprecated_component_ids: Set[int]
    components: List[Component]
    selectors: List[Selector]
    entities: List[Entity]
    events: List[Event]


class Generator:
    class Symbols:
        pass

    def __init__(self, ast_config: AstConfig, types: List[TypeDef]):
        self.used_component_ids = set()
        self.ast_config = ast_config
        self.symbols = Generator.Symbols()
        self.defs = Defs(set(), [], [], [], [])
        for t in types:
            if not t.synthetic:
                setattr(self.symbols, t.name, t)

    def define(self, symbol: Union[Component, Entity, Selector]):
        assert not hasattr(self.symbols, symbol.name)
        setattr(self.symbols, symbol.name, symbol)
        return symbol

    def add_event(self, name: str, fields):
        event = self.ast_config.make(
            Event, f"{name}Event", list(fields.items())
        )
        self.defs.events.append(self.define(event))

    def mark_deprecated_component(self, id: int):
        assert not id in self.used_component_ids
        self.used_component_ids.add(id)
        self.defs.deprecated_component_ids.add(id)

    def add_component(
        self,
        *,
        id: int,
        name: str,
        visibility: ComponentVisibility,
        fields,
        hfc: bool = False,
    ):
        assert id < 200
        assert not id in self.used_component_ids
        self.used_component_ids.add(id)

        # The following names have special meanings within entity objects, and
        # so are prohibited for use as component names.
        assert name.lower() != "id"
        assert name.lower() != "edit"

        component = self.ast_config.make(
            Component, id, name, visibility, list(fields.items()), hfc
        )
        self.defs.components.append(self.define(component))

    def add_entity(self, name: str, components):
        entity = self.ast_config.make(Entity, name, components)
        self.defs.entities.append(self.define(entity))

    def add_selector(
        self, name: str, components, *, index_type: IndexType = IndexType.SIMPLE
    ):
        selector = self.ast_config.make(
            Selector, f"{name}Selector", components, index_type
        )
        self.defs.selectors.append(self.define(selector))

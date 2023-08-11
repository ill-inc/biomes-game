from functools import cached_property
from hashlib import md5
from typing import Optional

from ecs_ast import (
    EXTERNALLY_DEFINED_TYPES,
    AstConfig,
    Component,
    TypeDef,
)
from jinja2 import Environment, FileSystemLoader

_BIGINT_KINDS = {"U64", "I64"}

_NUMERIC_KINDS = {"I8", "I16", "I32", "U8", "U16", "U32", "F32", "F64"}

_COPY_AS_VALUE_KINDS = (
    _BIGINT_KINDS
    | _NUMERIC_KINDS
    | {
        "BiomesId",
        "ShardId",
        "String",
        "Bool",
        "Enum",
    }
)

_JSON_KINDS = (_NUMERIC_KINDS - _BIGINT_KINDS) | {
    "String",
    "Enum",
    "Bool",
    "Tuple",
    "List",
    "Dict",
    "Optional",
    "Buffer",
}


class TsTypeDef(TypeDef):
    @property
    def numeric(self):
        return self.kind in _NUMERIC_KINDS

    @property
    def bigint(self):
        return self.kind in _BIGINT_KINDS

    @property
    def zdeclaration(self):
        if self.synthetic:
            return f"const z{self.name}"
        else:
            return f"export const z{self.name}"

    @property
    def declaration(self):
        if self.synthetic:
            return f"type {self.name}"
        else:
            return f"export type {self.name}"

    @property
    def readonly_declaration(self):
        if self.synthetic:
            return f"type Readonly{self.name}"
        else:
            return f"export type Readonly{self.name}"

    @property
    def readonly_ts_type(self):
        if self.kind in EXTERNALLY_DEFINED_TYPES:
            return f"Readonly{self.kind}"
        elif self.numeric:
            return "number"
        elif self.bigint:
            return "bigint"
        elif self.kind == "String":
            return "string"
        elif self.kind == "Buffer":
            return "Uint8Array"
        elif self.kind == "Bool":
            return "boolean"
        elif self.kind == "Enum":
            return "|".join(self.enum)
        elif self.kind == "Tuple":
            return (
                "readonly ["
                + ",".join([x.readonly_ts_type for x in self.subs.values()])
                + "]"
            )
        elif self.kind == "Optional":
            return "(" + self.subs[0].readonly_ts_type + ") | undefined"
        elif self.kind == "OneOf":
            return (
                "("
                + "|".join(
                    [
                        f'({sub.readonly_ts_type}) & {{ kind: "{key}" }}'
                        for key, sub in self.subs.items()
                    ]
                )
                + ")"
            )
        elif self.kind == "List":
            return f"ReadonlyArray<{self.subs[0].readonly_ts_type}>"
        elif self.kind == "Map":
            return f"ReadonlyMap<{self.subs[0].readonly_ts_type}, {self.subs[1].readonly_ts_type}>"
        elif self.kind == "Set":
            return f"ReadonlySet<{self.subs[0].readonly_ts_type}>"
        elif self.kind == "Dict":
            return (
                "{"
                + ",".join(
                    f"readonly {key}: {sub.readonly_ts_type}"
                    for key, sub in self.subs.items()
                )
                + "}"
            )
        else:
            raise ValueError(f"Unknown kind: {self.kind}")

    @property
    def ts_type(self):
        if self.kind in EXTERNALLY_DEFINED_TYPES:
            return self.kind
        elif self.numeric:
            return "number"
        elif self.bigint:
            return "bigint"
        elif self.kind == "Buffer":
            return "Uint8Array"
        elif self.kind == "String":
            return "string"
        elif self.kind == "Bool":
            return "boolean"
        elif self.kind == "Enum":
            return "|".join(self.enum)
        elif self.kind == "Tuple":
            return "[" + ",".join([x.ts_type for x in self.subs.values()]) + "]"
        elif self.kind == "Optional":
            return "(" + self.subs[0].ts_type + ") | undefined"
        elif self.kind == "OneOf":
            return (
                "("
                + "|".join(
                    [
                        f'({sub.ts_type}) & {{ kind: "{key}" }}'
                        for key, sub in self.subs.items()
                    ]
                )
                + ")"
            )
        elif self.kind == "List":
            return f"({self.subs[0].ts_type})[]"
        elif self.kind == "Map":
            return f"Map<{self.subs[0].ts_type}, {self.subs[1].ts_type}>"
        elif self.kind == "Set":
            return f"Set<{self.subs[0].ts_type}>"
        elif self.kind == "Dict":
            return (
                "{"
                + ",".join(
                    f"{key}: {sub.ts_type}" for key, sub in self.subs.items()
                )
                + "}"
            )
        else:
            raise ValueError(f"Unknown kind: {self.kind}")

    @property
    def ts_type_name(self):
        return self.name

    @cached_property
    def pure_json(self):
        if self.kind not in _JSON_KINDS:
            return False
        if self.structured:
            return all(sub.pure_json for sub in self.subs.values())
        return True

    @property
    def default_value(self):
        if self.kind in _COPY_AS_VALUE_KINDS or self.kind == "Optional":
            return f"default{self.name}"
        else:
            return f"default{self.name}()"

    def serialize(self, value_name: str, namespace: Optional[str] = None):
        if self.pure_json:
            return value_name
        prefix = f"{namespace}." if namespace else ""
        return f"{prefix}serialize{self.name}({value_name})"

    def deserialize(self, data_name: str, namespace: Optional[str] = None):
        prefix = f"{namespace}." if namespace else ""
        return f"{prefix}deserialize{self.name}({data_name})"


class TsComponent(Component):
    @property
    def ts_name(self):
        return self.name[0].lower() + self.name[1:]


AST_CONFIG = AstConfig({TypeDef: TsTypeDef, Component: TsComponent})


def gen_ts(gen_types, gen_defs, path):
    types = gen_types(AST_CONFIG)
    defs = gen_defs(AST_CONFIG, types)

    # Create the Jinja environment
    env = Environment(
        loader=FileSystemLoader("ecs/templates"),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    def render_template(template, out):
        tmpl = env.get_template(template)
        tmpl_out = tmpl.render(types=types, defs=defs)

        # Compute the md5 of the output
        m = md5()
        m.update(tmpl_out.encode("utf-8"))
        hash = m.hexdigest()

        # Replace OUTPUT_MD5 with the md5 of the output
        tmpl_out = tmpl_out.replace("$$OUTPUT_HASH$$", hash)

        with open(out, "w") as f:
            f.write(tmpl_out)
        print(f"Generated '{out}'")

    # Render the templates.
    render_template("types.ts.j2", f"{path}/types.ts")
    render_template("components.ts.j2", f"{path}/components.ts")
    render_template("entities.ts.j2", f"{path}/entities.ts")
    render_template("delta.ts.j2", f"{path}/delta.ts")
    render_template("lazy.ts.j2", f"src/server/shared/ecs/gen/lazy.ts")
    render_template("events.ts.j2", f"{path}/events.ts")
    render_template("json_serde.ts.j2", f"{path}/json_serde.ts")
    render_template("selectors.ts.j2", f"{path}/selectors.ts")

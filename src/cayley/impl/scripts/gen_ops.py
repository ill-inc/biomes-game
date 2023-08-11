"""Array code generator.

Usage: gen_ops.py [<out>]
"""

import os
from string import Template
from subprocess import run
from typing import Dict

from docopt import docopt

FILE_TEMPLATE = Template(
    """
use crate::arrays::erasure::AnyArray;
use crate::arrays::routines;
use crate::arrays::Array;
use crate::arrays::ArrayIterable;
use crate::io::Reader;
use crate::program::exec::Stack;

$table
$ops
"""
)


TABLE_TEMPLATE = Template(
    """
pub const OPS: &[(fn(&mut Reader, &mut Stack), &str)] = &[
    $ops
];
"""
)

TABLE_ENTRY_TEMPLATE = Template(
    """
    ($op, "$op"), // $index
"""
)


REF_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.get(code.read_ref()).unwrap().array_ref::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.clone()));
}
"""
)


MERGE_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let src = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    let dst = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(routines::merge(dst, src, code.read_range())));
}
"""
)


SLICE_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.view(code.read_range::<$dim>()).to_array()));
}
"""
)


EXPAND_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.all().expand(code.read_shape::<$dim>()).to_array()));
}
"""
)


RESHAPE_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.into_shape(code.read_shape::<$out>()).to_array()));
}
"""
)


CAST_OP_TEMPLATE = Template(
    """
fn $name(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.map(|x| x as $out).to_array()));
}
"""
)


FLIP_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.all().flip(code.read_mask::<$dim>()).to_array()));
}
"""
)


STEP_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.all().step(code.read_shape::<$dim>()).to_array()));
}
"""
)


FILL_OP_TEMPLATE = Template(
    """
fn $name(code: &mut Reader, stack: &mut Stack) {
    let s = code.read_shape::<$dim>();
    let v = code.read_$val().unwrap();
    stack.push(AnyArray::new(Array::fill(s, v)));
}
"""
)


UNARY_OP_TEMPLATE = Template(
    """
fn $name(_: &mut Reader, stack: &mut Stack) {
    let a = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(a.map(|x| $op x).to_array()));
}
"""
)


BINARY_OP_TEMPLATE = Template(
    """
fn $name(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    let l = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| x $op y).to_array()));
}
"""
)

MATH_OP_TEMPLATE = Template(
    """
fn $name(_: &mut Reader, stack: &mut Stack) {
    let r = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    let l = stack.pop().unwrap().array::<$val, $dim>().unwrap();
    stack.push(AnyArray::new(l.zip(r).map(|(x, y)| $fn(x, y)).to_array()));
}
"""
)


BOOL_VALS = ["bool"]
INTEGER_VALS = ["i8", "i16", "i32", "i64", "u8", "u16", "u32", "u64"]
FLOAT_VALS = ["f32", "f64"]


def op_name(name: str, val: str, dim: int):
    return f"{name}_{val}_{dim}"


def define_op(ops: Dict[str, str], template: Template, name: str, **kwargs):
    ops[name] = template.substitute(name=name, **kwargs)


def define_unary_op(
    ops: Dict[str, str], name: str, val: str, dim: int, op: str
):
    define_op(
        ops,
        UNARY_OP_TEMPLATE,
        op_name(name, val, dim),
        val=val,
        dim=dim,
        op=op,
    )


def define_binary_op(
    ops: Dict[str, str], name: str, val: str, dim: int, op: str
):
    define_op(
        ops,
        BINARY_OP_TEMPLATE,
        op_name(name, val, dim),
        val=val,
        dim=dim,
        op=op,
    )


def define_math_op(ops: Dict[str, str], name: str, val: str, dim: int, fn: str):
    define_op(
        ops,
        MATH_OP_TEMPLATE,
        op_name(name, val, dim),
        val=val,
        dim=dim,
        fn=fn,
    )


OPS = {}

# Add ref operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, REF_OP_TEMPLATE, op_name("ref", val, dim), val=val, dim=dim
        )


# Add merge operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, MERGE_OP_TEMPLATE, op_name("merge", val, dim), val=val, dim=dim
        )


# Add slice operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, SLICE_OP_TEMPLATE, op_name("slice", val, dim), val=val, dim=dim
        )


# Add expand operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS,
            EXPAND_OP_TEMPLATE,
            op_name("expand", val, dim),
            val=val,
            dim=dim,
        )


# Add reshape operations.
for out in [1, 2, 3, 4, 5]:
    for dim in [1, 2, 3, 4, 5]:
        for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
            define_op(
                OPS,
                RESHAPE_OP_TEMPLATE,
                op_name(f"reshape_{out}", val, dim),
                val=val,
                dim=dim,
                out=out,
            )


# Add cast operations.
for out in INTEGER_VALS + FLOAT_VALS:
    for dim in [1, 2, 3, 4, 5]:
        for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
            if val == out:
                continue
            if val in BOOL_VALS and out not in INTEGER_VALS:
                continue
            define_op(
                OPS,
                CAST_OP_TEMPLATE,
                op_name(f"cast_{out}", val, dim),
                val=val,
                dim=dim,
                out=out,
            )


# Add flip operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, FLIP_OP_TEMPLATE, op_name("flip", val, dim), val=val, dim=dim
        )


# Add step operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, STEP_OP_TEMPLATE, op_name("step", val, dim), val=val, dim=dim
        )


# Add fill operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_op(
            OPS, FILL_OP_TEMPLATE, op_name("fill", val, dim), val=val, dim=dim
        )


# Add arithmetic operations.
for dim in [1, 2, 3, 4, 5]:
    for val in INTEGER_VALS + FLOAT_VALS:
        define_binary_op(OPS, "add", val, dim, "+")
        define_binary_op(OPS, "div", val, dim, "/")
        define_binary_op(OPS, "mul", val, dim, "*")
        define_binary_op(OPS, "rem", val, dim, "%")
        define_binary_op(OPS, "sub", val, dim, "-")


# Add bitwise operations.
for dim in [1, 2, 3, 4, 5]:
    for val in INTEGER_VALS:
        define_unary_op(OPS, "neg", val, dim, "!")
        define_binary_op(OPS, "bit_and", val, dim, "&")
        define_binary_op(OPS, "bit_or", val, dim, "|")
        define_binary_op(OPS, "bit_xor", val, dim, "^")
        define_binary_op(OPS, "shl", val, dim, "<<")
        define_binary_op(OPS, "shr", val, dim, ">>")


# Add comparison operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS + INTEGER_VALS + FLOAT_VALS:
        define_binary_op(OPS, "gt", val, dim, ">")
        define_binary_op(OPS, "lt", val, dim, "<")
        define_binary_op(OPS, "ge", val, dim, ">=")
        define_binary_op(OPS, "le", val, dim, "<=")
        define_binary_op(OPS, "eq", val, dim, "==")
        define_binary_op(OPS, "ne", val, dim, "!=")


# Add logical operations.
for dim in [1, 2, 3, 4, 5]:
    for val in BOOL_VALS:
        define_unary_op(OPS, "not", val, dim, "!")
        define_binary_op(OPS, "and", val, dim, "&")
        define_binary_op(OPS, "or", val, dim, "|")
        define_binary_op(OPS, "xor", val, dim, "^")


# Add math operations.
for dim in [1, 2, 3, 4, 5]:
    for val in INTEGER_VALS + FLOAT_VALS:
        define_math_op(OPS, "max", val, dim, f"{val}::max")
        define_math_op(OPS, "min", val, dim, f"{val}::min")


def rustfmt():
    return os.environ.get("RUSTFMT", "rustfmt")


def gen(path="src/program/gen/ops.rs"):
    op_names, op_impls = zip(*sorted(OPS.items()))
    with open(path, "w") as f:
        f.write(
            FILE_TEMPLATE.substitute(
                table=TABLE_TEMPLATE.substitute(
                    ops="\n".join(
                        [
                            TABLE_ENTRY_TEMPLATE.substitute(index=i, op=op)
                            for i, op in enumerate(op_names)
                        ]
                    ),
                ),
                ops="\n".join(op_impls),
            )
        )

    # Format output (multiple calls needed for some reason).
    run([rustfmt(), path])
    run([rustfmt(), path])


if __name__ == "__main__":
    args = docopt(__doc__)
    if args["<out>"]:
        gen(args["<out>"])
    else:
        gen()

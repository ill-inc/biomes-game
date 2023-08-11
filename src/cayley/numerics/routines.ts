import type { Expr } from "@/cayley/numerics/expression";
import { fill, merge } from "@/cayley/numerics/expression";
import type { Range } from "@/cayley/numerics/ranges";
import type { Val } from "@/cayley/numerics/runtime";
import type { Shape } from "@/cayley/numerics/shapes";
import { mapTuple } from "@/cayley/numerics/util";
import type { JsValue } from "@/cayley/numerics/values";
import { defaultJsValue } from "@/cayley/numerics/values";

export function pad<V extends Val, S extends Shape>(
  expr: Expr<V, S>,
  lead: S,
  tail: S,
  value: JsValue<V> = defaultJsValue(expr.type)
) {
  return merge(
    fill(
      expr.type,
      mapTuple(expr.dims, (s, i) => s + lead[i] + tail[i]) as S,
      value
    ),
    expr,
    mapTuple(lead, (lo, i) => [lo, lo + expr.dims[i]]) as Range<S>
  );
}

// TODO: Add stack after adding a WASM "reshape" routine.

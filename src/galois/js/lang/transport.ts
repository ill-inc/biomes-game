import { toArray } from "@/galois/lang/parse";
import * as t from "@/gen/galois/js/lang/types";
import { assert } from "chai";

interface LiteralExpr {
  node: "literal";
  kind: string;
  type: string;
  data: boolean | number | string;
}

interface DerivedExpr {
  node: "derived";
  kind: string;
  type: string;
  deps: number[];
}

type Expr = LiteralExpr | DerivedExpr;

export type Program = Expr[];

export function toProgram(asset: t.Asset) {
  const index: Map<string, number> = new Map([]);
  const exprs: Expr[] = [];

  const getOrThrow = (hash: string) => {
    assert(index.has(hash), "Invalid asset definition");
    return index.get(hash)!;
  };

  for (const node of toArray(asset)) {
    index.set(node.hash, exprs.length);
    if (node.node == "literal") {
      exprs.push({
        node: "literal",
        kind: node.kind,
        type: node.type,
        data: node.data,
      });
    } else {
      exprs.push({
        node: "derived",
        kind: node.kind,
        type: node.type,
        deps: Array.from(node.deps).map((dep) => getOrThrow(dep.hash)),
      });
    }
  }

  return exprs;
}

export function fromProgram(program: Expr[]) {
  const index = new Map<number, t.Asset>();
  const getOrThrow = (i: number) => {
    assert(index.has(i), "Invalid asset program");
    return index.get(i)!;
  };
  program.forEach((expr, i) => {
    if (expr.node === "literal") {
      index.set(i, t.makeLiteral(expr.type, expr.kind, expr.data));
    } else {
      index.set(
        i,
        t.makeDerived(expr.type, expr.kind, expr.deps.map(getOrThrow))
      );
    }
  });
  return index.get(program.length - 1)!;
}

export function serialize(asset: t.Asset) {
  return JSON.stringify(toProgram(asset));
}

export function deserialize(asset: string) {
  return fromProgram(JSON.parse(asset));
}

export function copy<T extends string>(
  root: t.GeneralNode<T>
): t.GeneralNode<T> {
  if (t.isDerived<T>(root)) {
    return t.makeDerived<T>(root.type, root.kind, root.deps);
  } else {
    return t.makeLiteral<T>(root.type, root.kind, root.data);
  }
}

export function copyDeep<T extends string>(
  root: t.GeneralNode<T>
): t.GeneralNode<T> {
  return fromProgram(toProgram(root)) as t.GeneralNode<T>;
}

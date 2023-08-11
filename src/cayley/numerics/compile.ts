import type { GenericExpr } from "@/cayley/numerics/expression";
import { GENERATORS } from "@/cayley/numerics/generators";
import { Program } from "@/cayley/numerics/program";
import { ensure } from "@/cayley/numerics/util";

function compileTree(
  cache: Map<GenericExpr, number>,
  program: Program,
  expr: GenericExpr
) {
  const generate = (expr: GenericExpr) => {
    expr.deps.forEach(recurse);
    ensure(GENERATORS.get(expr.kind))(program, expr);
  };
  const recurse = (expr: GenericExpr) => {
    const index = cache.get(expr);
    if (index !== undefined) {
      program.op("ref", expr.type, expr.dims.length);
      program.ref(index);
    } else {
      generate(expr);
    }
  };
  generate(expr);
}

function stringifyTree(cache: Map<GenericExpr, number>, expr: GenericExpr) {
  const generate = (expr: GenericExpr) => {
    return `${expr.kind}(${expr.deps.map(recurse).join(", ")})`;
  };
  const recurse = (expr: GenericExpr): string => {
    const index = cache.get(expr);
    if (index !== undefined) {
      return `&x${index}`;
    } else {
      return generate(expr);
    }
  };
  return generate(expr);
}

function identifyCache(expr: GenericExpr) {
  const cache = new Map<GenericExpr, number>();
  const statements = new Map<GenericExpr, number>();

  // DFS to find nodes that require an explicit stack reservation.
  const visit = new Set<GenericExpr>();
  const recurse = (expr: GenericExpr) => {
    if (expr.kind == "input") {
      cache.set(expr, cache.get(expr) ?? cache.size);
    } else {
      if (visit.has(expr)) {
        statements.set(expr, statements.get(expr) ?? statements.size);
      } else {
        visit.add(expr);
        for (const dep of expr.deps) {
          recurse(dep);
        }
      }
    }
  };
  recurse(expr);

  // Push the statments into the cache.
  const base = cache.size;
  for (const [e, i] of statements) {
    cache.set(e, base + i);
  }

  return cache;
}

function orderedTrees(cache: Map<GenericExpr, number>) {
  return Array.from(cache.entries()).sort((a, b) => a[1] - b[1]);
}

export function compile(expr: GenericExpr): Readonly<Program> {
  const cache = identifyCache(expr);

  // Compile each tree in the ASG.
  const program = new Program();
  for (const [e, _] of orderedTrees(cache)) {
    compileTree(cache, program, e);
  }
  compileTree(cache, program, expr);
  return program;
}

export function stringify(expr: GenericExpr) {
  const cache = identifyCache(expr);

  // Compile each tree in the ASG.
  const ret = [];
  for (const [e, i] of orderedTrees(cache)) {
    ret.push(`x${i} = ${stringifyTree(cache, e)};`);
  }
  ret.push(`${stringifyTree(cache, expr)}`);
  return ret.join("\n");
}

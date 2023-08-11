import type { ArrayN } from "@/cayley/numerics/arrays";
import type { Val } from "@/cayley/numerics/runtime";
import type { Partial4 } from "@/cayley/numerics/shapes";
import { ensure } from "@/cayley/numerics/util";

function indent(index: Partial4) {
  return "  ".repeat(index.length);
}

function prettyPrint1(array: ArrayN<Val>, index: Partial4 = []) {
  const row = [];
  for (let i = 0; i < ensure(array.shape[index.length]); i += 1) {
    row.push(array.get([...index, i]));
  }
  return `${indent(index)}[ ${row.join(" ")} ]`;
}

function prettyPrintN(array: ArrayN<Val>, index: Partial4 = []): string {
  if (index.length === array.shape.length - 1) {
    return prettyPrint1(array, index);
  } else {
    const rows = [];
    for (let i = 0; i < ensure(array.shape[index.length]); i += 1) {
      rows.push(prettyPrintN(array, [...index, i] as Partial4));
    }
    return `${indent(index)}[\n${rows.join("\n")}\n${indent(index)}]`;
  }
}

export function prettyPrint(array: ArrayN<Val>) {
  return prettyPrintN(array);
}

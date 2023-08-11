import { hash } from "spark-md5";

export function hashLiteral(kind: string, data: boolean | number | string) {
  return hash(`${kind}:${data}`, false);
}

export function hashDerived(kind: string, deps: Array<{ hash: string }>) {
  const key = `${kind}:${deps.map((dep) => dep.hash).join(":")}`;
  return hash(key, false);
}

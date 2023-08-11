import * as t from "@/gen/galois/js/lang/types";

type NextFn = (node: t.Asset) => void;
type NodeFn = (node: t.Asset, next: NextFn) => void;

export function dfs(root: t.Asset, fn: NodeFn) {
  const done: Set<string> = new Set([]);
  const next = (node: t.Asset) => {
    if (!done.has(node.hash)) {
      done.add(node.hash);
      fn(node, next);
    }
  };
  fn(root, next);
}

export function dfsByType<T extends keyof t.AssetTypes>(
  root: t.Asset,
  type: T,
  fn: (node: t.GeneralNode<T>, next: NextFn) => void
) {
  dfs(root, (node, next) => {
    if (t.isNode(node, type)) {
      return fn(node, next);
    } else if (t.isDerived(node)) {
      node.deps.forEach(next);
    }
  });
}

export function toArray(root: t.Asset) {
  const output: t.Asset[] = [];
  dfs(root, (node, next) => {
    if (t.isDerived(node)) {
      node.deps.forEach(next);
    }
    output.push(node);
  });
  return output;
}

export function access(root: t.Asset, fn: (node: t.Asset) => void) {
  toArray(root).forEach((node) => fn(node));
}

export function accessByType<T extends keyof t.AssetTypes>(
  root: t.Asset,
  type: T,
  fn: (node: t.GeneralNode<T>) => void
) {
  return access(root, (node) => {
    if (t.isNode(node, type)) {
      fn(node);
    }
  });
}

export function modify(
  root: t.Asset,
  fn: (node: t.Asset) => t.Asset | undefined
) {
  const map = new Map<string, t.Asset>();
  access(root, (node) => {
    const hash = node.hash;
    if (t.isDerived(node)) {
      node = t.makeDerived(
        node.type,
        node.kind,
        node.deps.map((dep) => map.get(dep.hash)!)
      );
    }
    map.set(hash, fn(node) ?? node);
  });
  return map.get(root.hash)!;
}

export function modifyByType<T extends keyof t.AssetTypes>(
  root: t.Asset,
  type: T,
  fn: (node: t.GeneralNode<T>) => t.GeneralNode<T> | undefined
) {
  return modify(root, (node) => {
    if (t.isNode(node, type)) {
      return fn(node);
    }
    return node;
  });
}

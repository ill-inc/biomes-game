export interface Node<T> {
  parent: Node<T>;
  size: number;
  value: T;
}

export class DisjointSet<T> {
  private readonly nodes = new Map<T, Node<T>>();

  private nodeForValue(value: T): Node<T> {
    const existing = this.nodes.get(value);
    if (existing !== undefined) {
      return existing;
    }
    const created: any = {
      parent: undefined,
      size: 1,
      value,
    };
    created.parent = created;
    this.nodes.set(value, created);
    return created;
  }

  private findByNode(node: Node<T>) {
    while (node.parent !== node) {
      node.parent = node.parent.parent;
      node = node.parent;
    }
    return node;
  }

  add(value: T): void {
    this.nodeForValue(value);
  }

  find(x: T): T {
    return this.findByNode(this.nodeForValue(x)).value;
  }

  union(a: T, b: T): void {
    const na = this.findByNode(this.nodeForValue(a));
    const nb = this.findByNode(this.nodeForValue(b));
    if (na === nb) {
      return;
    }
    if (na.size > nb.size) {
      na.size += nb.size;
      nb.parent = na;
    } else {
      nb.size += na.size;
      na.parent = nb;
    }
  }

  extract(): T[][] {
    const setsByRoot = new Map<Node<T>, T[]>();
    for (const [x, node] of this.nodes) {
      const root = this.findByNode(node);
      const existing = setsByRoot.get(root);
      if (existing !== undefined) {
        existing.push(x);
      } else {
        setsByRoot.set(root, [x]);
      }
    }
    return Array.from(setsByRoot.values());
  }
}

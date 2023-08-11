export interface Vec2Map<V> {
  get: (item: [number, number]) => V | undefined;
  delete: (item: [number, number]) => void;
  set: (item: [number, number], value: V) => void;
  has: (item: [number, number]) => boolean;
}

const toStringKey = (item: [number, number]) => `${item[0]},${item[1]}`;

export class StringBackedVec2Map<V> implements Vec2Map<V> {
  private storage = new Map<string, V>();

  get(item: [number, number]) {
    return this.storage.get(toStringKey(item));
  }

  set(item: [number, number], value: V) {
    return this.storage.set(toStringKey(item), value);
  }

  delete(item: [number, number]) {
    return this.storage.delete(toStringKey(item));
  }

  has(item: [number, number]) {
    return this.storage.has(toStringKey(item));
  }
}

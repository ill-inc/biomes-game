export interface Vec3Set {
  add: (item: [number, number, number]) => void;
  delete: (item: [number, number, number]) => void;
  has: (item: [number, number, number]) => boolean;
}

const toStringKey = (item: [number, number, number]) =>
  `${item[0]},${item[1]},${item[2]}`;

export class StringBackedVec3Set implements Vec3Set {
  private storage = new Set<string>();

  add(item: [number, number, number]) {
    return this.storage.add(toStringKey(item));
  }

  delete(item: [number, number, number]) {
    return this.storage.delete(toStringKey(item));
  }
  has(item: [number, number, number]) {
    return this.storage.has(toStringKey(item));
  }
}

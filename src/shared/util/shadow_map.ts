class UndefinedMarker {}

// Map class that caches undefined explicitly.
export class ShadowMap<TKey, TValue> {
  private readonly map = new Map<TKey, TValue | UndefinedMarker>();

  merge(other: ShadowMap<TKey, TValue>) {
    for (const [key, value] of other.map) {
      this.map.set(key, value);
    }
  }

  get(key: TKey): [TValue | undefined, boolean] {
    const found = this.map.get(key);
    return [
      found instanceof UndefinedMarker ? undefined : found,
      found !== undefined,
    ];
  }

  set(id: TKey, value: TValue | undefined): void {
    this.map.set(id, value === undefined ? new UndefinedMarker() : value);
  }

  delete(key: TKey) {
    this.map.delete(key);
  }

  *values() {
    for (const value of this.map.values()) {
      if (value instanceof UndefinedMarker) {
        yield undefined;
      } else {
        yield value;
      }
    }
  }

  clear() {
    this.map.clear();
  }
}

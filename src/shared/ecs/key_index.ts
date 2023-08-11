import type { Create, Update } from "@/shared/ecs/change";
import type { ComponentName, Entity } from "@/shared/ecs/gen/entities";
import type { IndexQuery } from "@/shared/ecs/selectors/selector";
import type { SimpleIndex } from "@/shared/ecs/simple_index";
import type { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";
import { isEqual } from "lodash";

export interface KeyIndex<TKey> extends SimpleIndex {
  scanByKey(key: TKey): BiomesId[];
  getKeys(id: BiomesId): TKey[];
}

export class NoKeyChange {
  private readonly kind = "no_key_change";
}

export const NO_KEY_CHANGE = new NoKeyChange();

export type KeyFn<TKey> = (
  entity: Entity,
  change: Readonly<Create | Update> | undefined
) => TKey[] | NoKeyChange | undefined;

// Helper to construct a key based on data in a component, also appropriately
// returns no-change if the component was not part of a delta.
export function keyFromComponent<TKey, TComponent extends ComponentName>(
  component: TComponent,
  fn: (component: NonNullable<Entity[TComponent]>) => TKey[] | undefined
): KeyFn<TKey> {
  return (entity, change) => {
    if (change && change.entity[component] === undefined) {
      return NO_KEY_CHANGE;
    }
    const c = entity[component];
    if (!c) {
      return;
    }
    return fn(c);
  };
}

export class SimpleKeyIndex<TKey> implements KeyIndex<TKey> {
  private readonly keyToIds = new MultiMap<TKey, BiomesId>();
  private readonly idToKeys = new Map<BiomesId, TKey[]>();

  constructor(private readonly keys: KeyFn<TKey>) {}

  *scanAll() {
    yield* this.idToKeys.keys();
  }

  scanByKey(key: TKey) {
    return this.keyToIds.get(key) || [];
  }

  getKeys(id: BiomesId): TKey[] {
    return this.idToKeys.get(id) ?? [];
  }

  get size() {
    return this.idToKeys.size;
  }

  update(entity: Entity, change: Readonly<Create | Update> | undefined) {
    const newKeys = this.keys(entity, change);
    if (newKeys instanceof NoKeyChange) {
      return;
    }
    const oldKeys = this.idToKeys.get(entity.id);

    if (isEqual(oldKeys, newKeys)) {
      return;
    } else if (oldKeys !== undefined) {
      for (const oldKey of oldKeys) {
        this.keyToIds.delete(oldKey, entity.id);
      }
    }

    if (newKeys === undefined || newKeys.length === 0) {
      this.idToKeys.delete(entity.id);
      return;
    }
    this.idToKeys.set(entity.id, newKeys);
    for (const newKey of newKeys) {
      this.keyToIds.add(newKey, entity.id);
    }
  }

  delete(id: BiomesId) {
    const oldKeys = this.idToKeys.get(id);
    if (oldKeys === undefined) {
      return;
    }
    for (const oldKey of oldKeys) {
      this.keyToIds.delete(oldKey, id);
    }
    this.idToKeys.delete(id);
  }

  clear() {
    this.keyToIds.clear();
    this.idToKeys.clear();
  }
}

export class KeyIndexQuery<
  I extends string,
  TKey,
  C extends keyof Entity = "id",
  MetaIndex extends { [K in I]: KeyIndex<TKey> } = {
    [K in I]: KeyIndex<TKey>;
  }
> implements IndexQuery<MetaIndex, C>
{
  readonly kind = "index";
  readonly components?: C;
  constructor(private readonly index: I, private readonly keys: TKey[]) {}

  *run(metaIndex: MetaIndex) {
    for (const key of this.keys) {
      yield* metaIndex[this.index].scanByKey(key);
    }
  }

  size(metaIndex: MetaIndex): number {
    let size = 0;
    for (const key of this.keys) {
      size += metaIndex[this.index].scanByKey(key).length;
    }
    return size;
  }
}

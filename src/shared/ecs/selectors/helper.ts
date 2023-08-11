import { CheckIndex } from "@/shared/ecs/check_index";
import { Entity } from "@/shared/ecs/gen/entities";
import type { KeyFn, KeyIndex } from "@/shared/ecs/key_index";
import { KeyIndexQuery, SimpleKeyIndex } from "@/shared/ecs/key_index";
import {
  ComponentMultiQuery,
  ComponentPointQuery,
} from "@/shared/ecs/selectors/components";
import type { SimpleIndex } from "@/shared/ecs/simple_index";
import { SimpleIndexQuery } from "@/shared/ecs/simple_index";
import {
  SpatialIndex,
  SpatialIndexQuery,
} from "@/shared/ecs/spatial/spatial_index";
import type { SpatialQueryOptions } from "@/shared/ecs/spatial/types";
import type { BiomesId } from "@/shared/ids";
import type {
  ReadonlyAABB,
  ReadonlySphere,
  ReadonlyVec3,
} from "@/shared/math/types";

export interface SpecifiedComponentSelector<
  I extends string,
  C extends keyof Entity = "id"
> {
  readonly index: I;
  readonly components: C[];
  point(id: BiomesId): ComponentPointQuery<C>;
  multi(ids: BiomesId[]): ComponentMultiQuery<C>;
  readonly query: {
    all: () => SimpleIndexQuery<I, C>;
    spatial: {
      inSphere: (
        sphere: ReadonlySphere,
        options?: SpatialQueryOptions
      ) => SpatialIndexQuery<I, C>;
      inAabb: (
        aabb: ReadonlyAABB,
        options?: SpatialQueryOptions
      ) => SpatialIndexQuery<I, C>;
      atPoint: (
        point: ReadonlyVec3,
        options?: SpatialQueryOptions
      ) => SpatialIndexQuery<I, C>;
    };
    key: <
      TKey,
      MetaIndex extends { [K in I]: KeyIndex<TKey> } = {
        [K in I]: KeyIndex<TKey>;
      }
    >(
      ...keys: TKey[]
    ) => KeyIndexQuery<I, TKey, C, MetaIndex>;
  };
  readonly createIndexFor: {
    all: () => { [K in I]: SimpleIndex };
    subset: (pred: (e?: Entity) => boolean) => { [K in I]: SimpleIndex };
    spatial: () => {
      [K in I]: SpatialIndex;
    };
    key: <TKey>(keyFn: KeyFn<TKey>) => {
      [K in I]: KeyIndex<TKey>;
    };
  };
  readonly inverse: {
    idToKeys: <TKey, MetaIndex extends { [K in I]: KeyIndex<TKey> }>(
      indexes: MetaIndex,
      id: BiomesId
    ) => TKey[];
  };
}

export function createComponentSelector<
  I extends string,
  C extends keyof Entity = "id"
>(index: I, ...components: C[]): SpecifiedComponentSelector<I, C> {
  const matchFn = (e?: Entity) => Entity.has(e, ...components);
  return {
    index,
    components,
    point: (id) => new ComponentPointQuery(id, ...components),
    multi: (ids) => new ComponentMultiQuery(ids, ...components),
    query: {
      all: () => new SimpleIndexQuery<I, C>(index),
      spatial: {
        inSphere: (sphere: ReadonlySphere, options?: SpatialQueryOptions) =>
          new SpatialIndexQuery<I, C>(
            index,
            { kind: "sphere", shape: sphere },
            options
          ),
        inAabb: (aabb: ReadonlyAABB, options?: SpatialQueryOptions) =>
          new SpatialIndexQuery<I, C>(
            index,
            { kind: "aabb", shape: aabb },
            options
          ),
        atPoint: (point: ReadonlyVec3, options?: SpatialQueryOptions) =>
          new SpatialIndexQuery<I, C>(
            index,
            { kind: "point", shape: point },
            options
          ),
      },
      key: (...keys) => new KeyIndexQuery<I, (typeof keys)[0], C>(index, keys),
    },
    createIndexFor: {
      all: () =>
        ({
          [index]: new CheckIndex(matchFn) as SimpleIndex,
        } as {
          [K in I]: SimpleIndex;
        }),
      subset: (pred?: (e?: Entity) => boolean) =>
        ({
          [index]: new CheckIndex(
            pred ? (e) => matchFn(e) && pred(e) : matchFn
          ) as SimpleIndex,
        } as {
          [K in I]: SimpleIndex;
        }),
      spatial: () =>
        ({ [index]: new SpatialIndex(matchFn) } as {
          [K in I]: SpatialIndex;
        }),
      key: <TKey>(keyFn: KeyFn<TKey>) =>
        ({
          [index]: new SimpleKeyIndex((e, c) => {
            if (Entity.has(e, ...components)) {
              return keyFn(e, c);
            }
          }) as KeyIndex<TKey>,
        } as {
          [K in I]: KeyIndex<TKey>;
        }),
    },
    inverse: {
      idToKeys: (indexes, id) => indexes[index].getKeys(id),
    },
  };
}

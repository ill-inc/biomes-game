import type { Player } from "@/server/logic/events/player";
import type { WithInventory } from "@/server/logic/events/with_inventory";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import { ReadonlyDelta } from "@/shared/ecs/gen/delta";
import type {
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import type { ShardId } from "@/shared/ecs/gen/types";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { isBiomesId } from "@/shared/ids";
import { ok } from "assert";
import { isArray } from "lodash";

// TODO: Generalize this somehow.
export type QueryKeyType = "terrainByShardId" | "presetByLabel";

export type TypeForKeyType<K extends QueryKeyType> =
  K extends "terrainByShardId"
    ? ShardId
    : K extends "presetByLabel"
    ? string
    : never;

export class ByKey<TKeyType extends QueryKeyType> {
  constructor(
    public readonly keyType: TKeyType,
    public readonly key: TypeForKeyType<TKeyType>
  ) {}

  // Override toString
  toString() {
    return `[by-key ${this.keyType} ${this.key}]`;
  }
}

export type QuerySpecialization = "none" | "terrain" | "player" | "inventory";

export class Query<
  TId extends
    | BiomesId
    | readonly BiomesId[]
    | ByKey<any>
    | ByKey<any>[] = BiomesId,
  TIncludeIced extends boolean = false,
  TOptional extends boolean = false,
  TSpecialization extends QuerySpecialization = "none",
  TComponents extends keyof ReadonlyEntity = "id"
> {
  public readonly kind = "query";
  constructor(
    public readonly plan: {
      id: TId;
      includeIced: TIncludeIced;
      optional: TOptional;
      specialization: TSpecialization;
      components: TComponents[];
    }
  ) {}

  static for(id: BiomesId): Query<BiomesId>;
  static for(ids: readonly BiomesId[]): Query<BiomesId[]>;
  static for<TKeyType extends QueryKeyType>(
    byKey: ByKey<TKeyType>
  ): Query<ByKey<TKeyType>>;
  static for<TKeyType extends QueryKeyType>(
    byKey: ByKey<TKeyType>[]
  ): Query<ByKey<TKeyType>[]>;
  static for(
    id: BiomesId | readonly BiomesId[] | ByKey<any> | ByKey<any>[]
  ): Query<
    BiomesId | readonly BiomesId[] | ByKey<any> | ByKey<any>[],
    false,
    false,
    "none",
    "id"
  > {
    return new Query({
      id,
      includeIced: false,
      optional: false,
      specialization: "none",
      components: [],
    });
  }

  with<T extends (keyof ReadonlyEntity)[]>(
    ...components: [...T]
  ): Query<
    TId,
    TIncludeIced,
    TOptional,
    TSpecialization,
    T[number] | TComponents
  > {
    return new Query({
      ...this.plan,
      components: [...this.plan.components, ...components],
    });
  }

  optional(): Query<TId, TIncludeIced, true, TSpecialization, TComponents> {
    return new Query({
      ...this.plan,
      optional: true,
    });
  }

  includeIced(): Query<TId, true, TOptional, TSpecialization, TComponents> {
    return new Query({
      ...this.plan,
      includeIced: true,
    });
  }

  terrain(): Query<TId, TIncludeIced, TOptional, "terrain", TComponents> {
    ok(this.plan.specialization === "none");
    return new Query({
      ...this.plan,
      specialization: "terrain",
    });
  }

  player(): Query<TId, TIncludeIced, TOptional, "player", TComponents> {
    ok(this.plan.specialization === "none");
    return new Query({
      ...this.plan,
      specialization: "player",
    });
  }

  inventory(): Query<TId, TIncludeIced, TOptional, "inventory", TComponents> {
    ok(this.plan.specialization === "none");
    return new Query({
      ...this.plan,
      specialization: "inventory",
    });
  }
}

export type AnyQuery = Query<
  BiomesId | BiomesId[] | ByKey<any> | ByKey<any>[],
  boolean,
  boolean,
  QuerySpecialization,
  keyof ReadonlyEntity
>;

export class QueryBuilderRoot {
  id(id: BiomesId) {
    return Query.for(id);
  }

  ids(ids: readonly BiomesId[]) {
    return Query.for(ids);
  }

  byKey<TKeyType extends QueryKeyType>(
    keyType: TKeyType,
    key: TypeForKeyType<TKeyType>
  ) {
    return Query.for(new ByKey(keyType, key));
  }

  byKeys<TKeyType extends QueryKeyType>(
    keyType: TKeyType,
    ...keys: TypeForKeyType<TKeyType>[]
  ) {
    return Query.for(keys.map((key) => new ByKey(keyType, key)));
  }

  // Shortcuts.
  terrain(id: BiomesId) {
    return Query.for(id).terrain();
  }

  player(id: BiomesId) {
    return Query.for(id).player();
  }

  inventory(id: BiomesId) {
    return Query.for(id).inventory();
  }

  includeIced(id: BiomesId) {
    return Query.for(id).includeIced();
  }

  optional(id: BiomesId): Query<BiomesId, false, true>;
  optional(id: BiomesId | undefined): Query<BiomesId, false, true> | undefined;
  optional(id: BiomesId | undefined) {
    if (id === undefined) {
      return;
    }
    return Query.for(id).optional();
  }

  worldMetadata() {
    return this.id(WorldMetadataId).with("world_metadata");
  }
}

export const q = new QueryBuilderRoot();

export type QueriedEntity = Delta;

export type QueriedEntityWith<C extends keyof ReadonlyEntity> = DeltaWith<C>;

export type HandleOptional<
  TOptional extends boolean,
  TBase
> = TOptional extends true ? TBase | undefined : TBase;

export type SingularQueryResult<T> = T extends Query<
  any,
  any,
  infer TOptional,
  infer TSpecialization,
  infer TComponents
>
  ? TSpecialization extends "terrain"
    ? HandleOptional<TOptional, Terrain>
    : TSpecialization extends "player"
    ? HandleOptional<TOptional, Player>
    : TSpecialization extends "inventory"
    ? HandleOptional<TOptional, WithInventory>
    : HandleOptional<TOptional, QueriedEntityWith<TComponents>>
  : never;

export type QueryResult<T> = T extends undefined
  ? undefined
  : T extends BiomesId
  ? QueriedEntity
  : T extends Query<
      infer TId,
      any,
      infer _TOptional,
      infer _TReadonly,
      infer _TComponents
    >
  ? TId extends any[]
    ? Exclude<SingularQueryResult<T>, undefined>[]
    : SingularQueryResult<T>
  : never;

// For a query, extract the ID of the entity involved.
export function* determineIds(
  query: BiomesId | ByKey<any> | AnyQuery | undefined
): Generator<BiomesId | ByKey<any>, undefined, undefined> {
  if (query === undefined) {
    return;
  } else if (isBiomesId(query)) {
    yield query;
  } else if (query instanceof ByKey) {
    yield query;
  } else if (isBiomesId(query.plan.id)) {
    yield query.plan.id;
  } else if (query.plan.id instanceof ByKey) {
    yield query.plan.id;
  } else {
    for (const subId of query.plan.id) {
      yield* determineIds(subId);
    }
  }
}

export class MissingOk {
  public readonly kind = "missing";
}
export interface EntitySource {
  get<TSpecialization extends QuerySpecialization>(
    specialization: TSpecialization,
    id: BiomesId | ByKey<QueryKeyType>
  ): readonly [number, ResultForSpecialization<TSpecialization> | undefined];
}

export type ResultForSpecialization<T> = T extends "terrain"
  ? Terrain
  : T extends "player"
  ? Player
  : T extends "inventory"
  ? WithInventory
  : Delta;

function satisfySingle<TQuery extends AnyQuery, TKeyType extends QueryKeyType>(
  source: EntitySource,
  query: TQuery,
  id: BiomesId | ByKey<TKeyType>
): SingularQueryResult<TQuery> | undefined {
  const [, result] = source.get(query.plan.specialization, id);
  if (!result) {
    return;
  }
  if (
    result instanceof ReadonlyDelta &&
    !query.plan.includeIced &&
    result.iced()
  ) {
    return;
  }
  if (!result.has(...query.plan.components)) {
    return;
  }
  return result as SingularQueryResult<TQuery>;
}

export function satisfyQuery<TQuery extends AnyQuery | BiomesId>(
  source: EntitySource,
  query: TQuery
): QueryResult<TQuery> | undefined | MissingOk {
  if (isBiomesId(query)) {
    return satisfySingle(
      source,
      Query.for(query),
      query
    ) as QueryResult<TQuery>;
  } else if (!isArray(query.plan.id)) {
    const result = satisfySingle(source, query, query.plan.id);
    if (query.plan.optional && result === undefined) {
      return new MissingOk();
    }
    return result as QueryResult<TQuery>;
  } else {
    return query.plan.id
      .map((id: BiomesId | ByKey<any>) => satisfySingle(source, query, id))
      .filter((x: any) => x !== undefined) as QueryResult<TQuery>;
  }
}

export interface ReadonlyEntitySource {
  get(id: BiomesId | ByKey<QueryKeyType>): ReadonlyEntity | undefined;
}

export type SingularReadonlyQueryResult<T> = T extends Query<
  any,
  any,
  infer TOptional,
  any,
  infer TComponents
>
  ? HandleOptional<TOptional, ReadonlyEntityWith<TComponents>>
  : never;

export type ReadonlyQueryResult<T> = T extends BiomesId
  ? ReadonlyEntity
  : T extends Query<
      infer TId,
      any,
      infer _TOptional,
      infer _TReadonly,
      infer _TComponents
    >
  ? TId extends any[]
    ? Exclude<SingularReadonlyQueryResult<T>, undefined>[]
    : SingularReadonlyQueryResult<T>
  : never;

function satisfyReadonlySingle<
  TQuery extends AnyQuery,
  TKeyType extends QueryKeyType
>(
  source: ReadonlyEntitySource,
  query: TQuery,
  id: BiomesId | ByKey<TKeyType>
): SingularReadonlyQueryResult<TQuery> | undefined {
  const result = source.get(id);
  if (!result) {
    return;
  }
  if (!query.plan.includeIced && result.iced) {
    return;
  }
  if (!Entity.has(result, ...query.plan.components)) {
    return;
  }
  return result as SingularReadonlyQueryResult<TQuery>;
}

export function satisfyReadonlyQuery<TQuery extends AnyQuery | BiomesId>(
  source: ReadonlyEntitySource,
  query: TQuery
): ReadonlyQueryResult<TQuery> | undefined | MissingOk {
  if (isBiomesId(query)) {
    return satisfyReadonlySingle(
      source,
      Query.for(query),
      query
    ) as ReadonlyQueryResult<TQuery>;
  } else if (!isArray(query.plan.id)) {
    const result = satisfyReadonlySingle(source, query, query.plan.id);
    if (query.plan.optional && result === undefined) {
      return new MissingOk();
    }
    return result as ReadonlyQueryResult<TQuery>;
  } else {
    return query.plan.id
      .map((id: BiomesId | ByKey<any>) =>
        satisfyReadonlySingle(source, query, id)
      )
      .filter((x: any) => x !== undefined) as ReadonlyQueryResult<TQuery>;
  }
}

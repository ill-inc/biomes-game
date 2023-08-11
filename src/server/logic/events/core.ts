import type {
  AnyQuery,
  QueriedEntityWith,
  QueryResult,
  ReadonlyQueryResult,
  SingularQueryResult,
} from "@/server/logic/events/query";
import { ByKey, determineIds } from "@/server/logic/events/query";
import type { ReadonlyDelta } from "@/shared/ecs/gen/delta";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type {
  AnyEvent,
  AnyHandlerEvent,
  EventSet,
} from "@/shared/ecs/gen/events";
import type {
  AclAction,
  Item,
  ReadonlyAclDomain,
} from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { entriesIn, isInteger } from "lodash";

export class NewId {
  public readonly kind = "newId";
}

export function newId(): NewId {
  return new NewId();
}

export class NewIds {
  public readonly kind = "newIds";

  constructor(public readonly count: number = 1) {
    ok(isInteger(count), "count must be an integer");
    ok(count <= 100, "Can only generate up to 100 IDs at once.");
  }
}

export function newIds(count = 1): NewIds {
  return new NewIds(count);
}

export class AclCheckDomain {
  public readonly kind = "aclCheckDomain";

  constructor(
    public readonly domain: ReadonlyAclDomain,
    public readonly userId: BiomesId
  ) {}
}

export function aclChecker(
  domain: ReadonlyAclDomain,
  userId: BiomesId
): AclCheckDomain {
  return new AclCheckDomain(domain, userId);
}

export interface AclChecker {
  kind: "aclChecker";
  canPerformItemAction: (
    item: Item,
    options?: {
      // Narrow down the ACL check to these points (must be a subset of the
      // ACL checker's domain).
      atPoints?: ReadonlyVec3[];
      // If specified, will check for additional ACLs associated with the
      // entity itself.
      entity?: ReadonlyDelta;
    }
  ) => boolean;
  can: (
    action: AclAction,
    options?: {
      // Narrow down the ACL check to these points (must be a subset of the
      // ACL checker's domain).
      atPoints?: ReadonlyVec3[];
      // If specified, will check for additional ACLs associated with the
      // entity itself.
      entity?: ReadonlyDelta;
    }
  ) => boolean;
  restoreTimeSecs: (action: AclAction) => number | undefined;
}

// All the involved queries.
export type PrepareSpecification = {
  [key: string]: BiomesId | AnyQuery | undefined;
};

export type PreparedEntities<T extends PrepareSpecification> = {
  [K in keyof T & string]: ReadonlyQueryResult<T[K]>;
};

// All the involved queries.
export type InvolvedSpecification = {
  [key: string]:
    | BiomesId
    | AnyQuery
    | NewId
    | NewIds
    | AclCheckDomain
    | undefined;
};

export type InvolvedKeysFor<T extends InvolvedSpecification, TTarget> = keyof {
  [K in keyof T]: T[K] extends TTarget ? K : never;
} &
  string;

// Results for all the involved specification.
export type InvolvedEntities<T extends InvolvedSpecification> = {
  [K in keyof T & string]: T[K] extends NewIds
    ? BiomesId[]
    : T[K] extends NewId
    ? BiomesId
    : T[K] extends AclCheckDomain
    ? AclChecker
    : QueryResult<T[K]>;
};

export type AnySingularResultType = BiomesId | SingularQueryResult<AnyQuery>;

// Particular event class by kind.
export type EventFor<TKind> = AnyEvent & { kind: TKind };

export type HandlerEventFor<TKind> = AnyHandlerEvent & { kind: TKind };

// Throw this to discard the event's changes, can be useful when returning.
export class RollbackError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// Core implementation of a handlers for events.
export interface EventHandler<
  TEvent,
  TInvolvedSpecification extends InvolvedSpecification,
  TPrepareInvolvedSpecification extends PrepareSpecification,
  TPrepareResults
> {
  readonly kind: unknown; // Useful for debugging.
  mergeKey?: (event: TEvent) => unknown;
  prepareInvolves?: (event: TEvent) => TPrepareInvolvedSpecification;
  prepare?: <C extends PrepareContext>(
    results: PreparedEntities<TPrepareInvolvedSpecification>,
    event: TEvent,
    context: C
  ) => TPrepareResults;
  involves: (
    event: TEvent,
    prepared: TPrepareResults
  ) => TInvolvedSpecification;
  apply: <C extends EventContext<TInvolvedSpecification>>(
    results: InvolvedEntities<TInvolvedSpecification>,
    event: TEvent,
    context: C
  ) => void;
}

export type AnyEventHandler = EventHandler<any, any, any, any>;

// Create an invent handler for the given event kind.
export function makeEventHandler<
  TKind extends keyof EventSet,
  TInvolvedSpecification extends InvolvedSpecification,
  TPrepareInvolvedSpecification extends PrepareSpecification = {},
  TPrepareResults = {}
>(
  kind: TKind,
  {
    mergeKey,
    prepareInvolves,
    prepare,
    involves,
    apply,
  }: {
    mergeKey?: (event: EventFor<TKind>) => unknown;
    prepareInvolves?: (event: EventFor<TKind>) => TPrepareInvolvedSpecification;
    prepare?: <C extends PrepareContext>(
      results: PreparedEntities<TPrepareInvolvedSpecification>,
      event: EventFor<TKind>,
      context: C
    ) => TPrepareResults;
    involves: (
      event: EventFor<TKind>,
      prepared: TPrepareResults
    ) => TInvolvedSpecification;
    apply: <C extends EventContext<TInvolvedSpecification>>(
      results: InvolvedEntities<TInvolvedSpecification>,
      event: HandlerEventFor<TKind>,
      context: C
    ) => void;
  }
) {
  return {
    kind,
    prepareInvolves,
    prepare,
    mergeKey,
    involves,
    apply,
  } as EventHandler<
    EventFor<TKind>,
    TInvolvedSpecification,
    TPrepareInvolvedSpecification,
    TPrepareResults
  >;
}

// Count new Ids
export function countNewIds<
  T extends InvolvedSpecification | PrepareSpecification
>(spec: T): number {
  let newIds = 0;
  for (const [, value] of entriesIn(spec)) {
    if (value instanceof NewIds) {
      newIds += value.count;
    } else if (value instanceof NewId) {
      newIds += 1;
    }
  }
  return newIds;
}

export interface IndexResolver {
  resolveIndexLookup(id: ByKey<any>): BiomesId | undefined;
}

// Determine all keys used in a specification
export function* determineIdsUsed<
  T extends InvolvedSpecification | PrepareSpecification
>(resolver: IndexResolver, spec: T): Iterable<BiomesId> {
  for (const [, value] of entriesIn(spec)) {
    if (
      value instanceof NewIds ||
      value instanceof NewId ||
      value instanceof AclCheckDomain
    ) {
      continue;
    }
    for (const id of determineIds(value)) {
      if (id instanceof ByKey) {
        const resolved = resolver.resolveIndexLookup(id);
        if (resolved !== undefined) {
          yield resolved;
        }
      } else {
        yield id;
      }
    }
  }
}

export type OnlyDefinedKeys<T> = keyof {
  [K in keyof T]: T[K] extends undefined ? never : K;
};

export type DefinedKeys<T> = OnlyDefinedKeys<T> & keyof ReadonlyEntity;

export interface PrepareContext {
  readonly voxeloo: VoxelooModule;
}

export interface EventContext<
  TInvolvedSpecification extends InvolvedSpecification
> extends PrepareContext {
  readonly involved: TInvolvedSpecification;
  readonly results: InvolvedEntities<TInvolvedSpecification>;
  publish(event: FirehoseEvent): void;
  create<TEntity extends ReadonlyEntity>(
    entity: TEntity
  ): QueriedEntityWith<DefinedKeys<TEntity>>;
  delete(id?: BiomesId): void;
}

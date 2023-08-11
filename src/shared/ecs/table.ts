import type {
  Change,
  Create,
  ReadonlyChanges,
  Update,
} from "@/shared/ecs/change";
import { applyProposedChange, changedBiomesId } from "@/shared/ecs/change";
import type {
  ComponentName,
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import type { MetaIndex, SelectorQuery } from "@/shared/ecs/selectors/selector";
import type { VersionStamper } from "@/shared/ecs/version";
import { TickVersionStamper } from "@/shared/ecs/version";
import { WrappedEntity } from "@/shared/ecs/zod";
import { EmitterSubscription } from "@/shared/events";
import type { BiomesId } from "@/shared/ids";
import { isBiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";
import { zrpcWebSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { EventEmitter } from "events";
import { pick } from "lodash";
import type TypedEventEmitter from "typed-emitter";

export type EntityState<TVersion> = [TVersion, ReadonlyEntity | undefined];

export type DeltaSinceToken = string & { readonly "": unique symbol };

function sanitizeTick(tick: number) {
  // REMOVE ME
  if (typeof tick === "bigint") {
    ok(tick < BigInt(2 ** 52));
    return Number(tick);
  }

  return tick;
}

export interface WriteableTable {
  clear(): void;
  load(id: BiomesId, state: Readonly<EntityState<number>>): boolean;
  apply(changes: ReadonlyChanges): ReadonlyChanges | undefined;
}

export type VersionedTableEvents = {
  preApply: (ids: BiomesId[]) => void;
  postApply: (changes: ReadonlyChanges) => void;
  clear: () => void;
};

type VersionedTableEventsOnOff = Pick<
  TypedEventEmitter<VersionedTableEvents>,
  "on" | "off"
>;

export interface VersionedTable<TVersion> {
  readonly tick: number;
  readonly recordSize: number;

  readonly events: VersionedTableEventsOnOff;

  getWithVersion(id: BiomesId): Readonly<EntityState<TVersion>>;
  get(query: BiomesId): ReadonlyEntity | undefined;

  has(id: BiomesId): boolean;

  contents(): Iterable<ReadonlyEntity>;

  mark(): DeltaSinceToken;

  deltaSince(
    token?: undefined
  ): Iterable<[BiomesId, Readonly<[TVersion, ReadonlyEntity]>]>;
  deltaSince(
    token: DeltaSinceToken
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
}

export interface MetaIndexTable<TVersion, MI extends MetaIndex<MI>>
  extends VersionedTable<TVersion> {
  readonly metaIndex: MI;

  // Warning, if you use 'get' with a selector that would otherwise return multiple
  // results, this will return solely the first one.
  get<_C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId
  ): ReadonlyEntity | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: SelectorQuery<MI, C>
  ): ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ): ReadonlyEntity | ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ): ReadonlyEntity | ReadonlyEntityWith<C> | undefined;

  count<C extends keyof ReadonlyEntity>(query: SelectorQuery<MI, C>): number;
  scan<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<ReadonlyEntityWith<C>>;
  scanIds<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<BiomesId>;
}

export class VersionedTableImpl<TVersion>
  implements VersionedTable<TVersion>, WriteableTable
{
  #tick: number = 0;
  readonly #data = new Map<BiomesId, EntityState<TVersion>>();

  readonly #events =
    new EventEmitter() as TypedEventEmitter<VersionedTableEvents>;

  constructor(
    private readonly versionStamper: VersionStamper<TVersion>,
    private readonly keepTombstones: boolean = false
  ) {}

  get tick(): number {
    return this.#tick;
  }

  get recordSize(): number {
    return this.#data.size;
  }

  get events(): VersionedTableEventsOnOff {
    return this.#events;
  }

  clear() {
    this.#data.clear();
    this.#tick = 0;
    this.#events.emit("clear");
  }

  load(id: BiomesId, state: Readonly<EntityState<number>>): boolean {
    let [version] = state;
    version = sanitizeTick(version);

    const existing = this.#data.get(id);
    if (
      existing !== undefined &&
      this.versionStamper.isAhead(existing[0], version)
    ) {
      return false;
    }

    this.#events.emit("preApply", [id]);

    this.#tick = Math.max(this.#tick, version);
    if (state[1] === undefined && !this.keepTombstones) {
      if (existing) {
        this.#data.delete(id);
        this.#events.emit("postApply", [{ kind: "delete", tick: version, id }]);
      }
    } else {
      const entityState: EntityState<TVersion> = [
        this.versionStamper.createFor(version),
        state[1],
      ];
      this.#data.set(id, entityState);
      if (state[1]) {
        this.#events.emit("postApply", [
          { kind: "create", tick: version, entity: state[1] },
        ]);
      } else {
        this.#events.emit("postApply", [{ kind: "delete", tick: version, id }]);
      }
    }

    return true;
  }

  apply(changes: ReadonlyChanges) {
    const appliedChanges = [];

    this.#events.emit("preApply", changes.map(changedBiomesId));

    for (const change of changes) {
      const id = changedBiomesId(change);
      const existing = this.#data.get(id);
      if (
        existing !== undefined &&
        this.versionStamper.isAhead(existing[0], change.tick)
      ) {
        // No change, existing is ahead.
        continue;
      }
      this.#tick = Math.max(this.#tick, change.tick);
      const prior = existing?.[1];
      const after = applyProposedChange(prior, change);
      if (prior === undefined && after === undefined) {
        // No change, it was a delete no-op.
        continue;
      }
      if (after === undefined && !this.keepTombstones) {
        // Delete the entity, keeping no record.
        if (existing !== undefined) {
          this.#data.delete(id);
          appliedChanges.push(change);
        }
      } else if (existing !== undefined) {
        // Update the existing record.
        existing[0] = this.versionStamper.update(existing[0], change);
        existing[1] = after;
        appliedChanges.push(change);
      } else {
        // Create a new record.
        this.#data.set(id, [
          this.versionStamper.update(undefined, change),
          after,
        ]);
        appliedChanges.push(change);
      }
    }
    if (appliedChanges.length > 0) {
      this.#events.emit("postApply", appliedChanges);
      return appliedChanges;
    }
    return undefined;
  }

  getWithVersion(id: BiomesId): Readonly<EntityState<TVersion>> {
    return this.#data.get(id) ?? [this.versionStamper.zero, undefined];
  }

  export(id: BiomesId, ...components: ComponentName[]): string {
    return exportEntity(this, id, ...components);
  }

  has(id: BiomesId): boolean {
    return this.get(id) !== undefined;
  }

  *contents(): Generator<ReadonlyEntity, void, unknown> {
    for (const [, [, entity]] of this.deltaSince()) {
      yield entity;
    }
  }

  mark(): DeltaSinceToken {
    return String(this.#tick) as DeltaSinceToken;
  }

  deltaSince(
    token?: undefined
  ): Iterable<[BiomesId, Readonly<[TVersion, ReadonlyEntity]>]>;
  deltaSince(
    token: DeltaSinceToken
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  *deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]> {
    const tick = parseInt(token ?? "1");
    if (tick <= 1) {
      for (const [id, state] of this.#data) {
        if (state[1] !== undefined) {
          yield [id, state];
        }
      }
    } else {
      ok(this.keepTombstones, "Delta only makes sense with keepTombstones");
      for (const [id, state] of this.#data) {
        if (this.versionStamper.isAtOrAhead(state[0], tick)) {
          yield [id, state];
        }
      }
    }
  }

  get(query: BiomesId): ReadonlyEntity | undefined {
    return this.#data.get(query)?.[1];
  }
}

export function exportEntity<TVersion>(
  table: VersionedTable<TVersion>,
  id: BiomesId,
  ...components: ComponentName[]
): string {
  const entity = table.get(id);
  ok(entity);
  // Useful for getting data for prod for tests.
  return zrpcWebSerialize(
    WrappedEntity.for(
      components.length > 0 ? pick(entity, "id", ...components) : entity
    )
  );
}

export class MetaIndexTableImpl<TVersion, MI extends MetaIndex<MI>>
  implements MetaIndexTable<TVersion, MI>
{
  private delegateEvents: EmitterSubscription<VersionedTableEvents>;
  readonly events =
    new EventEmitter() as TypedEventEmitter<VersionedTableEvents>;

  constructor(
    private readonly delegate: VersionedTable<TVersion>,
    public readonly metaIndex: MI
  ) {
    for (const entity of delegate.contents()) {
      this.updateIndexes(entity.id, entity, undefined);
    }

    this.delegateEvents = new EmitterSubscription(this.delegate.events, {
      postApply: (changes) => {
        for (const change of changes) {
          const id = changedBiomesId(change);
          this.updateIndexes(id, this.get(id), change);
        }
        this.events.emit("postApply", changes);
      },
      preApply: (ids) => this.events.emit("preApply", ids),
      clear: () => {
        for (const key in this.metaIndex) {
          this.metaIndex[key].clear();
        }
        this.events.emit("clear");
      },
    });
  }

  stop() {
    this.delegateEvents.off();
  }

  get tick(): number {
    return this.delegate.tick;
  }

  get recordSize(): number {
    return this.delegate.recordSize;
  }

  private updateIndexes(
    id: BiomesId,
    entity: ReadonlyEntity | undefined,
    change: Readonly<Change> | undefined
  ) {
    if (entity) {
      for (const key in this.metaIndex) {
        this.metaIndex[key].update(
          entity,
          change as Readonly<Create | Update> | undefined
        );
      }
    } else {
      for (const key in this.metaIndex) {
        this.metaIndex[key].delete(id);
      }
    }
  }

  getWithVersion(id: BiomesId): Readonly<EntityState<TVersion>> {
    return this.delegate.getWithVersion(id);
  }

  export(id: BiomesId, ...components: ComponentName[]): string {
    return exportEntity(this, id, ...components);
  }

  has(id: BiomesId): boolean {
    return this.delegate.has(id);
  }

  contents(): Iterable<ReadonlyEntity> {
    return this.delegate.contents();
  }

  mark(): DeltaSinceToken {
    return this.delegate.mark();
  }

  deltaSince(
    token?: undefined
  ): Iterable<[BiomesId, Readonly<[TVersion, ReadonlyEntity]>]>;
  deltaSince(
    token: DeltaSinceToken
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]>;
  *deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TVersion>>]> {
    yield* this.delegate.deltaSince(token);
  }

  // Warning, if you use 'get' with a selector that would otherwise return multiple
  // results, this will return solely the first one.
  get<_C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId
  ): ReadonlyEntity | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: SelectorQuery<MI, C>
  ): ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ): ReadonlyEntity | ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ) {
    if (isBiomesId(queryOrId)) {
      return this.delegate.get(queryOrId);
    }
    for (const entity of this.scan(queryOrId)) {
      return entity;
    }
  }

  *scan<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<ReadonlyEntityWith<C>> {
    switch (query.kind) {
      case "index":
        for (const id of query.run(this.metaIndex)) {
          const entity = this.get(id);
          if (entity) {
            yield entity as ReadonlyEntityWith<C>;
          }
        }
        break;
      case "point":
        {
          const entity = this.get(query.id);
          if (query.wouldMatch(entity)) {
            yield entity;
          }
        }
        break;
      case "multi":
        for (const id of query.ids) {
          const entity = this.get(id);
          if (query.wouldMatch(entity)) {
            yield entity;
          }
        }
        break;
      default:
        assertNever(query);
    }
  }

  *scanIds<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<BiomesId> {
    switch (query.kind) {
      case "index":
        yield* query.run(this.metaIndex);
        break;
      case "point":
        yield query.id;
        break;
      case "multi":
        yield* query.ids;
        break;
      default:
        assertNever(query);
    }
  }

  count<C extends keyof ReadonlyEntity>(query: SelectorQuery<MI, C>): number {
    let count = 0;
    switch (query.kind) {
      case "index":
        count += query.size(this.metaIndex);
        break;
      case "point":
        {
          const entity = this.get(query.id);
          if (query.wouldMatch(entity)) {
            count += 1;
          }
        }
        break;
      case "multi":
        for (const id of query.ids) {
          const entity = this.get(id);
          if (query.wouldMatch(entity)) {
            count += 1;
          }
        }
        break;
      default:
        assertNever(query);
    }
    return count;
  }
}

export type Table<MI extends MetaIndex<MI>> = MetaIndexTable<number, MI>;

export function createTable<MI extends MetaIndex<MI>>(
  metaIndex: MI
): WriteableTable & Table<MI> {
  const writeable = new VersionedTableImpl(new TickVersionStamper());
  return writeableMetaIndexTable(
    writeable,
    new MetaIndexTableImpl(writeable, metaIndex)
  );
}

// Convenience function to add WriteableTable methods to an object, e.g. to
// give a single table object that you can write/read from.
function writeableMetaIndexTable<T extends {}>(
  writeableTable: WriteableTable,
  metaIndexTable: T
): WriteableTable & T {
  Object.assign(metaIndexTable, {
    clear: () => writeableTable.clear(),
    load: (id: BiomesId, state: Readonly<EntityState<number>>) =>
      writeableTable.load(id, state),
    apply: (changes: ReadonlyChanges) => writeableTable.apply(changes),
  } satisfies WriteableTable);
  return metaIndexTable as WriteableTable & T;
}

export class AdaptTable<TFromVersion, TToVersion, MI extends MetaIndex<MI>>
  implements MetaIndexTable<TToVersion, MI>
{
  private delegateEvents: EmitterSubscription<VersionedTableEvents>;
  readonly events =
    new EventEmitter() as TypedEventEmitter<VersionedTableEvents>;

  constructor(
    private readonly delegate: MetaIndexTable<TFromVersion, MI>,
    private readonly convert: (from: TFromVersion) => TToVersion
  ) {
    this.delegateEvents = new EmitterSubscription(this.delegate.events, {
      postApply: (changes) => this.events.emit("postApply", changes),
      preApply: (ids) => this.events.emit("preApply", ids),
      clear: () => this.events.emit("clear"),
    });
  }

  stop() {
    this.delegateEvents.off();
  }

  get tick() {
    return this.delegate.tick;
  }

  get recordSize() {
    return this.delegate.recordSize;
  }

  get metaIndex() {
    return this.delegate.metaIndex;
  }

  getWithVersion(id: BiomesId): EntityState<TToVersion> {
    const [version, entity] = this.delegate.getWithVersion(id);
    return [this.convert(version), entity];
  }

  has(id: BiomesId): boolean {
    return this.delegate.has(id);
  }

  contents(): Iterable<ReadonlyEntity> {
    return this.delegate.contents();
  }

  mark(): DeltaSinceToken {
    return this.delegate.mark();
  }

  deltaSince(
    token?: undefined
  ): Iterable<[BiomesId, Readonly<[TToVersion, ReadonlyEntity]>]>;
  deltaSince(
    token: DeltaSinceToken
  ): Iterable<[BiomesId, Readonly<EntityState<TToVersion>>]>;
  deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TToVersion>>]>;
  *deltaSince(
    token?: DeltaSinceToken | undefined
  ): Iterable<[BiomesId, Readonly<EntityState<TToVersion>>]> {
    for (const [id, [version, entity]] of this.delegate.deltaSince(token)) {
      yield [id, [this.convert(version), entity]];
    }
  }

  get<_C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId
  ): ReadonlyEntity | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: SelectorQuery<MI, C>
  ): ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ): ReadonlyEntity | ReadonlyEntityWith<C> | undefined;
  get<C extends keyof ReadonlyEntity>(
    queryOrId: BiomesId | SelectorQuery<MI, C>
  ) {
    return this.delegate.get(queryOrId);
  }

  count<C extends keyof ReadonlyEntity>(query: SelectorQuery<MI, C>): number {
    return this.delegate.count(query);
  }

  scan<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<ReadonlyEntityWith<C>> {
    return this.delegate.scan(query);
  }

  scanIds<C extends keyof ReadonlyEntity>(
    query: SelectorQuery<MI, C>
  ): Iterable<BiomesId> {
    return this.delegate.scanIds(query);
  }
}

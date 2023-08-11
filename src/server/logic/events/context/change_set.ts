import type { VersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { Player } from "@/server/logic/events/player";
import type {
  ByKey,
  QueryKeyType,
  QuerySpecialization,
  ResultForSpecialization,
} from "@/server/logic/events/query";
import { WithInventory } from "@/server/logic/events/with_inventory";
import type { Catchup, ChangeToApply, Iff } from "@/shared/api/transaction";
import { ProposedChangeBuffer } from "@/shared/ecs/change";
import type {
  Delta,
  DeltaPatch,
  PatchableEntity,
} from "@/shared/ecs/gen/delta";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { ShadowMap } from "@/shared/util/shadow_map";
import { ok } from "assert";

export interface FinalizedChangeSet<THandled> {
  handled: THandled[];
  usedIds: Set<BiomesId>;
  transaction: ChangeToApply;
}

// Tracks a bunch of linked changes to be applied together, each
// associated with a 'handle' that marks their origin (e.g. an event).
export class ChangeSet<THandled> {
  public readonly versionMap = new Map<BiomesId, number>();
  private readonly fetched = new ShadowMap<
    BiomesId,
    PatchableEntity | Terrain
  >();
  private readonly handled: THandled[] = [];
  private readonly changes = new ProposedChangeBuffer();
  private readonly events: FirehoseEvent[] = [];
  private readonly createdIds = new Set<BiomesId>();
  private readonly deletedIds = new Set<BiomesId>();
  private readonly cachedForks = new Map<BiomesId, DeltaPatch>();
  public dirty = false;

  constructor(private readonly backing: VersionedEntitySource<any>) {}

  // Assumes the two changesets do not overlap in effects.
  merge(other: ChangeSet<THandled>) {
    for (const [id, tick] of other.versionMap) {
      this.versionMap.set(id, tick);
    }
    this.fetched.merge(other.fetched);
    this.handled.push(...other.handled);
    this.changes.push(other.changes.pop());
    this.events.push(...other.events);
    for (const id of other.createdIds) {
      this.createdIds.add(id);
    }
    for (const id of other.deletedIds) {
      this.deletedIds.add(id);
    }
    this.dirty ||= other.dirty;
  }

  delete(id: BiomesId) {
    this.dirty = true;
    this.deletedIds.add(id);
    this.changes.push([
      {
        kind: "delete",
        id,
      },
    ]);
    this.backing.delete(id);
  }

  create(builder: PatchableEntity) {
    this.dirty = true;
    ok(
      (this.versionMap.get(builder.id) ?? 0) === 0 &&
        !this.createdIds.has(builder.id),
      "Cannot create ontop of entities."
    );
    this.createdIds.add(builder.id);
    this.versionMap.set(builder.id, 0);
    this.changes.push([
      {
        kind: "create",
        entity: builder.finishAsNew(),
      },
    ]);
  }

  publish(events: FirehoseEvent[]) {
    this.dirty = true;
    this.events.push(...events);
  }

  markHandled(handled: THandled) {
    this.dirty = true;
    this.handled.push(handled);
  }

  get<TSpecialization extends QuerySpecialization>(
    specialization: TSpecialization,
    id: BiomesId | ByKey<QueryKeyType>
  ): [number, ResultForSpecialization<TSpecialization> | undefined] {
    const [tick, result] = this.backing.get(specialization, id);
    if (!result) {
      return [tick, undefined];
    }
    this.versionMap.set(result.id, tick);
    this.fetched.set(result.id, result);
    if (result instanceof Terrain) {
      return [
        tick,
        result as unknown as ResultForSpecialization<TSpecialization>,
      ];
    }
    // We return a fork of the entity so they can commit it later.
    let fork = this.cachedForks.get(result.id);
    if (fork === undefined) {
      fork = result.fork();
      this.cachedForks.set(result.id, fork);
    }
    if (specialization === "player") {
      return [
        tick,
        new Player(fork) as ResultForSpecialization<TSpecialization>,
      ];
    } else if (specialization === "inventory") {
      const inventory = WithInventory.for(fork);
      if (!inventory) {
        return [tick, undefined];
      }
      return [tick, inventory as ResultForSpecialization<TSpecialization>];
    }
    return [tick, fork as Delta as ResultForSpecialization<TSpecialization>];
  }

  build(): FinalizedChangeSet<THandled> | undefined {
    for (const entity of this.fetched.values()) {
      if (!entity || this.deletedIds.has(entity.id)) {
        continue;
      }
      const delta = entity?.finish();
      if (delta === undefined) {
        continue;
      }
      this.changes.push([
        {
          kind: "update",
          entity: delta,
        },
      ]);
    }
    if (this.events.length === 0 && this.changes.empty) {
      return;
    }
    const catchups: Catchup[] = [];
    const iffs: Iff[] = [];
    for (const [id, version] of this.versionMap) {
      if (version === 0) {
        iffs.push([id, version]);
        continue;
      }
      const [fetched] = this.fetched.get(id);
      if (fetched === undefined) {
        catchups.push([id, version]);
        continue;
      }
      if (fetched instanceof Terrain) {
        iffs.push([id, version]);
        continue;
      }
      if (fetched.readComponentIds.size === 0) {
        catchups.push([id, version]);
        continue;
      }
      iffs.push([id, version, ...fetched.readComponentIds]);
    }
    return {
      handled: this.handled,
      usedIds: this.createdIds,
      transaction: {
        iffs,
        catchups,
        changes: this.changes.pop(),
        events: this.events,
      },
    };
  }
}

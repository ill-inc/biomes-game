import type { AskMetaIndex } from "@/server/ask/table";
import { createAskIndexConfig } from "@/server/ask/table";
import type { LogicMetaIndex } from "@/server/logic/ecs";
import { createLogicIndexConfig } from "@/server/logic/ecs";
import { canApply, EagerChangeBuffer } from "@/server/shared/ecs/transactions";
import type { Firehose } from "@/server/shared/firehose/api";
import type { ReplicaEvents } from "@/server/shared/replica/table";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { Change, ReadonlyProposedChanges } from "@/shared/ecs/change";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { DeltaSinceToken, WriteableTable } from "@/shared/ecs/table";
import {
  AdaptTable,
  MetaIndexTableImpl,
  VersionedTableImpl,
} from "@/shared/ecs/table";
import type { EntityVersion } from "@/shared/ecs/version";
import { EntityVersionStamper } from "@/shared/ecs/version";
import { WrappedChange } from "@/shared/ecs/zod";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { EventEmitter } from "stream";
import type TypedEventEmitter from "typed-emitter";

export type InMemoryWorldEvents = ReplicaEvents & {
  events: (events: FirehoseEvent[]) => void;
};

export class InMemoryWorld extends (EventEmitter as {
  new (): TypedEventEmitter<InMemoryWorldEvents>;
}) {
  private readonly baseTable = new VersionedTableImpl(
    new EntityVersionStamper(),
    true
  );

  // We use the logic server's indexes to facilitate easy testing.
  public readonly table = new MetaIndexTableImpl<
    EntityVersion,
    LogicMetaIndex & AskMetaIndex
  >(this.baseTable, {
    ...createLogicIndexConfig(),
    ...createAskIndexConfig(),
  });
  public readonly adaptedTable = new AdaptTable(
    this.table,
    (from) => from.tick
  );

  constructor(
    createWorldMetadata = true,
    private readonly firehose?: Firehose
  ) {
    super();
    this.setMaxListeners(Infinity);
    if (createWorldMetadata) {
      // Test in-memory worlds always have metadata.
      this.baseTable.apply([
        {
          kind: "create",
          tick: 1,
          entity: {
            id: WorldMetadataId,
            world_metadata: {
              aabb: {
                v0: [0, 0, 0],
                v1: [0, 0, 0],
              },
            },
          },
        },
      ]);
    }
  }

  mark() {
    return this.table.mark();
  }

  deltaSince(token?: DeltaSinceToken | undefined) {
    return this.adaptedTable.deltaSince(token);
  }

  getWithVersion(id: BiomesId) {
    return this.adaptedTable.getWithVersion(id);
  }

  get writeableTable(): WriteableTable {
    return this.baseTable;
  }

  private process(
    newTick: number,
    changesToApply: ChangeToApply[],
    eagerChanges: EagerChangeBuffer
  ) {
    const allChanges: Change[] = [];
    const allEvents: FirehoseEvent[] = [];
    const outcomes: ApplyStatus[] = [];

    // Process the changes.
    for (const changeToApply of changesToApply) {
      if (!canApply(changeToApply, this.table, eagerChanges)) {
        outcomes.push("aborted");
        continue;
      }
      if (changeToApply.events) {
        allEvents.push(...changeToApply.events);
      }
      if (changeToApply.changes) {
        const withTicks = changeToApply.changes.map((w) => ({
          ...w,
          tick: newTick,
        }));
        this.baseTable.apply(withTicks);
        allChanges.push(...withTicks);
      }
      outcomes.push("success");
    }
    return [allChanges, allEvents, outcomes] as const;
  }

  private notify(allChanges: Change[], allEvents: FirehoseEvent[]) {
    // Emit anything to downstream.
    if (allChanges.length > 0) {
      this.emit("tick", allChanges);
    }
    if (allEvents.length > 0) {
      this.emit("events", allEvents);
      // Fire and forget, okay is only for dev.
      void this.firehose?.publish(...allEvents);
    }
  }

  private computeEagerChanges(
    eagerChanges: EagerChangeBuffer,
    changesToApply: ChangeToApply[]
  ): WrappedChange[] {
    for (const { catchups } of changesToApply) {
      if (catchups === undefined) {
        continue;
      }
      for (const [id, tick] of catchups) {
        const [version, entity] = this.table.getWithVersion(id);
        eagerChanges.changesSince(id, tick, version, entity);
      }
    }
    return eagerChanges.pop().map((c) => new WrappedChange(c));
  }

  apply(
    changesToApply: ChangeToApply[]
  ): [outcomes: ApplyStatus[], eagerChanges: WrappedChange[]] {
    const newTick = this.table.tick + 1;

    const eagerChanges = new EagerChangeBuffer();
    const [allChanges, allEvents, outcomes] = this.process(
      newTick,
      changesToApply,
      eagerChanges
    );
    this.notify(allChanges, allEvents);
    return [outcomes, this.computeEagerChanges(eagerChanges, changesToApply)];
  }

  applyChanges(changes: ReadonlyProposedChanges) {
    const newTick = this.table.tick + 1;
    const allChanges = changes.map((c) => ({ ...c, tick: newTick }));
    this.baseTable.apply(allChanges);
    this.notify(allChanges, []);
  }
}

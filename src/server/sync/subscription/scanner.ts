import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { BDB } from "@/server/shared/storage";
import {
  type SyncIndex,
  type WatchedShape,
} from "@/server/sync/subscription/sync_index";
import { allFollowIds } from "@/server/web/db/social";
import { BackgroundTaskController } from "@/shared/abort";
import { SHARD_RADIUS } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec3 } from "@/shared/math/types";
import { sleep } from "@/shared/util/async";
import EventEmitter from "events";
import type TypedEventEmitter from "typed-emitter";

export type ScannerEvents = {
  delta: (changes: LazyChange[], delta: Map<BiomesId, boolean>) => void;
};

function clampRadius(radius: number) {
  return (
    Math.max(Math.min(radius, CONFIG.defaultSyncRadius), CONFIG.minSyncRadius) +
    SHARD_RADIUS
  );
}

class FollowingTracker {
  private readonly controller = new BackgroundTaskController();
  private last = new Set<BiomesId>();
  private delta = new Map<BiomesId, boolean>();

  constructor(private readonly db: BDB, private readonly userId: BiomesId) {
    this.controller.runInBackground("update-friends", (signal) =>
      this.periodicallyUpdateFriends(signal)
    );
  }

  pop(): Map<BiomesId, boolean> {
    const delta = this.delta;
    this.delta = new Map();
    return delta;
  }

  has(id: BiomesId) {
    return this.last.has(id);
  }

  private async periodicallyUpdateFriends(signal: AbortSignal) {
    do {
      try {
        const following = new Set(await allFollowIds(this.db, this.userId));
        for (const id of this.last) {
          if (!following.has(id)) {
            // We were following them, but no more, remove from delta.
            this.delta.set(id, false);
          }
        }
        for (const id of following) {
          if (!this.last.has(id)) {
            // We were not following, but now we are, add to delta.
            this.delta.set(id, true);
          }
        }
        this.last = following;
      } catch (error) {
        log.warn("Could not update friends, will try again soon", { error });
      }
    } while (await sleep(CONFIG.syncRefreshFollowingIntervalMs, signal));
  }

  async stop() {
    return this.controller.abortAndWait();
  }
}

export class Scanner extends (EventEmitter as {
  new (): TypedEventEmitter<ScannerEvents>;
}) {
  public readonly residentSet: Set<BiomesId>;
  private readonly watched: WatchedShape;
  private readonly syncVolumeResidentSet = new Set<BiomesId>();
  private readonly following: FollowingTracker;

  constructor(
    db: BDB,
    private readonly index: SyncIndex,
    private readonly entityId: BiomesId,
    radius: number
  ) {
    super();
    this.residentSet = new Set([...index.getRobots(entityId), entityId]);
    this.watched = this.index.watch("sphere", entityId, clampRadius(radius));
    this.watched.on("delta", this.onDelta);
    this.updateRadius(radius);
    this.following = new FollowingTracker(db, entityId);
  }

  get radius() {
    return this.watched.radius;
  }

  flush() {
    this.watched.flush();
  }

  updateRadius(radius: number) {
    this.watched.resize(clampRadius(radius));
  }

  updatePosition(position: Vec3) {
    this.watched.move(position);
  }

  dump(): unknown {
    return {
      residentSetSize: this.residentSet.size,
      watched: this.watched?.dump(),
    };
  }

  private onDelta = (changes: LazyChange[], delta: Map<BiomesId, boolean>) => {
    const myRobots = this.index.getRobots(this.entityId);
    for (const [id, added] of delta) {
      if (added) {
        this.residentSet.add(id);
        this.syncVolumeResidentSet.add(id);
      } else {
        this.syncVolumeResidentSet.delete(id);
        // If a robot or a followed thing is asked to be removed, ignore it.
        if (myRobots.has(id) || this.following.has(id)) {
          delta.delete(id);
          continue;
        }
        this.residentSet.delete(id);
      }
    }
    // Add any changes in following.
    for (const [id, added] of this.following.pop()) {
      if (added) {
        this.residentSet.add(id);
      } else if (!this.syncVolumeResidentSet.has(id)) {
        // No longer a friend, and no longer in the sync volume.
        this.residentSet.delete(id);
      } else {
        continue; // Don't do anything with this.
      }
      delta.set(id, added);
    }
    if (changes.length > 0 || delta.size > 0) {
      this.emit("delta", changes, delta);
    }
  };

  async stop() {
    this.watched.stop();
    await this.following.stop();
  }
}

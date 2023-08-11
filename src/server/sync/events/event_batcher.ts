import type { AnyEventHandler } from "@/server/logic/events/core";
import { GameEvent } from "@/server/shared/api/game_event";
import type { ClientEventHandler } from "@/server/sync/client";
import type {
  CrossClientEventBatcher,
  EventCallback,
  EventCb,
} from "@/server/sync/events/cross_client";
import { ShortCircuit } from "@/server/sync/events/short_circuit";
import type { AnyEvent, EventSet } from "@/shared/ecs/gen/events";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { DefaultMap } from "@/shared/util/collections";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";

const nop = () => {};
class ActiveEventTracker {
  private readonly active = new DefaultMap<keyof EventSet, Set<unknown>>(
    () => new Set()
  );

  constructor(
    private readonly handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>
  ) {}

  add(event: AnyEvent): (() => void) | undefined {
    const handler = this.handlers.get(event.kind);
    if (handler === undefined) {
      log.warn(`NO HANDLER FOR EVENT: ${event.kind} - IT WILL BE IGNORED`);
      return;
    }

    if (handler.mergeKey === undefined) {
      return nop;
    }

    const key = handler.mergeKey(event);
    const active = this.active.get(event.kind);
    const priorSize = active.size;
    active.add(key);
    if (active.size > priorSize) {
      return () => active.delete(key);
    }
  }
}

export class ClientEventBatcher implements ClientEventHandler {
  private readonly pending: [AnyEvent, EventCallback][] = [];
  private readonly active: ActiveEventTracker;
  private readonly shortCircuit: ShortCircuit;

  constructor(
    handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>,
    private readonly crossClient: CrossClientEventBatcher,
    private readonly userId: BiomesId,
    lastApproxPosition?: ReadonlyVec3f
  ) {
    this.active = new ActiveEventTracker(handlers);
    this.shortCircuit = new ShortCircuit(lastApproxPosition);
  }

  get size() {
    return this.pending.length + (this.shortCircuit.dirty ? 1 : 0);
  }

  async push(event: AnyEvent | undefined) {
    if (!event) {
      return;
    }

    if (this.shortCircuit.maybeUpdate(event)) {
      return;
    }

    const completeFn = this.active.add(event);
    if (!completeFn) {
      // It's a duplicate or in-flight, ignore it again.
      return;
    }

    if (this.size > CONFIG.syncMaxPendingInboundEvents) {
      completeFn();
      throw new RpcError(
        grpc.status.RESOURCE_EXHAUSTED,
        "Too many pending events"
      );
    }

    return new Promise<void>((resolve, reject) => {
      this.pending.push([
        event,
        (error?: unknown) => (error ? reject(error) : resolve()),
      ]);
    }).finally(() => completeFn());
  }

  flush() {
    const batch: EventCb[] = this.pending
      .splice(0, CONFIG.syncMaxInboundEventsPerFrame)
      .map(([event, cb]) => [new GameEvent(this.userId, event), cb]);
    if (batch.length > 0 || this.shortCircuit.dirty) {
      this.crossClient.push(this.userId, batch, this.shortCircuit);
    }
    return this.size > 0;
  }
}

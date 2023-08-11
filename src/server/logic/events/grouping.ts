import type { AnyEventHandler } from "@/server/logic/events/core";
import type { AnyEvent, EventSet } from "@/shared/ecs/gen/events";
import { log } from "@/shared/logging";
import { isArray } from "lodash";

export type WorkByHandler = [AnyEventHandler, AnyEvent[]];

export class ReducingEventSet {
  private readonly grouped = new Map<
    keyof EventSet,
    AnyEvent[] | Map<unknown, AnyEvent>
  >();
  public size = 0;

  constructor(
    private readonly handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>
  ) {}

  add(event: AnyEvent): boolean {
    const handler = this.handlers.get(event.kind);
    if (handler === undefined) {
      log.warn(`NO HANDLER FOR EVENT: ${event.kind} - IT WILL BE IGNORED`);
      return false;
    }

    if (handler.mergeKey === undefined) {
      this.size++;
      const existing = this.grouped.get(event.kind) as AnyEvent[] | undefined;
      if (existing !== undefined) {
        existing.push(event);
      } else {
        this.grouped.set(event.kind, [event]);
      }
      return true;
    }

    const key = handler.mergeKey(event);
    const existing = this.grouped.get(event.kind) as
      | Map<unknown, AnyEvent>
      | undefined;
    if (existing === undefined) {
      this.size++;
      this.grouped.set(event.kind, new Map([[key, event]]));
      return true;
    } else if (existing.has(key)) {
      return false;
    }
    this.size++;
    existing.set(key, event);
    return true;
  }

  *[Symbol.iterator](): IterableIterator<WorkByHandler> {
    for (const [kind, events] of this.grouped) {
      const handler = this.handlers.get(kind)!;
      if (isArray(events)) {
        yield [handler, events];
      } else {
        yield [handler, Array.from(events.values())];
      }
    }
  }
}

export function reduceEvents(
  handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>,
  events: AnyEvent[]
): AnyEvent[] {
  const set = new ReducingEventSet(handlers);
  for (const event of events) {
    set.add(event);
  }
  return Array.from(set).flatMap(([_, events]) => events);
}

export function groupByHandlerInto(
  handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>,
  events: Iterable<AnyEvent>,
  into: Map<keyof EventSet, WorkByHandler>
) {
  const set = new ReducingEventSet(handlers);
  for (const event of events) {
    set.add(event);
  }
  for (const work of set) {
    const [, events] = work;
    into.set(events[0].kind, work);
  }
  return set.size;
}

export function groupByHandler(
  handlers: ReadonlyMap<keyof EventSet, AnyEventHandler>,
  events: Iterable<AnyEvent>
) {
  const ret = new Map<keyof EventSet, WorkByHandler>();
  groupByHandlerInto(handlers, events, ret);
  return ret;
}

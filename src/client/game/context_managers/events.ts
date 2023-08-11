import type { ClientContext } from "@/client/game/context";
import type { ClientIo } from "@/client/game/context_managers/client_io";
import type { Event } from "@/shared/ecs/gen/events";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { DefaultMap } from "@/shared/util/collections";
import { makeCvalHook } from "@/shared/util/cvals";
import { zip } from "lodash";

export type EventCallback = (error?: unknown) => void;

// Only accept certain events once per frame.
const HIGH_FREQUENCY_EVENT_KINDS = new Set<Event["kind"]>([
  "moveEvent",
  "updateGroupPreviewEvent",
  "inventoryChangeSelectionEvent",
  "emoteEvent",
]);

class HFEventBuffer {
  private readonly events = new Map<Event["kind"], Event>();

  get size() {
    return this.events.size;
  }

  maybePush(event: Event) {
    if (HIGH_FREQUENCY_EVENT_KINDS.has(event.kind)) {
      this.events.set(event.kind, event);
      return true;
    }
    return false;
  }

  pop(): Event[] {
    const events = [...this.events.values()];
    this.events.clear();
    return events;
  }

  clear() {
    this.events.clear();
  }
}

export class Events {
  private readonly events: [Event, EventCallback][] = [];
  private readonly highFrequencyEvents = new HFEventBuffer();
  private readonly countByKind = new DefaultMap<
    Event["kind"],
    { value: number }
  >((kind) => {
    const data = { value: 0 };
    makeCvalHook<number>({
      path: ["game", "events", kind],
      help: `Number of events of kind ${kind}`,
      collect: () => data.value,
    });
    return data;
  });
  private inflightHighFrequencyEvents: Promise<unknown> = Promise.resolve();

  constructor(private readonly io: ClientIo) {}

  clear() {
    this.highFrequencyEvents.clear();
    this.events.length = 0;
  }

  async publish(event: Event) {
    if (!this.highFrequencyEvents.maybePush(event)) {
      return new Promise<void>((resolve, reject) => {
        this.events.push([
          event,
          (error) => (error ? reject(error) : resolve()),
        ]);
      });
    }
  }

  private incrementCounters(events: Event[]) {
    for (const event of events) {
      this.countByKind.get(event.kind).value++;
    }
  }

  private flushHighFrequencyEvents() {
    if (this.highFrequencyEvents.size === 0) {
      return;
    }
    this.inflightHighFrequencyEvents = this.inflightHighFrequencyEvents.then(
      async () => {
        const batch = this.highFrequencyEvents.pop();
        if (batch.length === 0) {
          return;
        }
        this.incrementCounters(batch);
        try {
          await this.io.publishOneWay(batch);
        } catch (error) {
          log.warn("Could not publish high frequency events", { error });
        }
      }
    );
  }

  private async flushNormalEvents() {
    if (this.events.length === 0) {
      return;
    }
    const batch = this.events.splice(0, this.events.length);

    const events = batch.map(([event]) => event);
    this.incrementCounters(events);
    try {
      const results = await this.io.publish(events);
      for (const [result, event] of zip(results, batch)) {
        const [, callback] = event!;
        if (!result) {
          callback();
          continue;
        }
        const error = new Error(result);
        log.error("Could not publish event", { error });
        callback(error);
      }
    } catch (error) {
      log.error("Could not publish events", { error });
      for (const [, callback] of batch) {
        callback(error);
      }
    }
  }

  async flush() {
    this.flushHighFrequencyEvents();
    await this.flushNormalEvents();
  }
}

export async function loadEvents(loader: RegistryLoader<ClientContext>) {
  return new Events(await loader.get("io"));
}

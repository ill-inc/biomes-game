import type { DeltaPatch } from "@/shared/ecs/gen/delta";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { FirehoseEvent } from "@/shared/firehose/events";

export class Specialized {
  protected constructor(
    protected readonly fork: DeltaPatch,
    protected readonly events: FirehoseEvent[] = []
  ) {}

  has<C extends keyof Entity>(...components: C[]): boolean {
    return this.fork.has(...components);
  }

  get id() {
    return this.fork.id;
  }

  commit() {
    this.fork.commit();
    const events = [...this.events];
    this.events.length = 0;
    return events;
  }
}

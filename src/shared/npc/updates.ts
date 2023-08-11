import type { AsDelta, Npc } from "@/shared/ecs/gen/entities";
import type { AnyEvent } from "@/shared/ecs/gen/events";

export class TickUpdates {
  constructor(
    public readonly state: ReadonlyArray<AsDelta<Npc>> = [],
    public readonly events: ReadonlyArray<AnyEvent> = []
  ) {}

  merge(other?: TickUpdates): TickUpdates {
    if (!other) {
      return this;
    }
    return new TickUpdates(
      [...this.state, ...other.state],
      [...this.events, ...other.events]
    );
  }
}

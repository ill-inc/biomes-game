import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseTrigger } from "@/server/shared/triggers/trigger";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import { matches } from "@/shared/triggers/matcher";
import type { Matcher } from "@/shared/triggers/matcher_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zEventStoredTriggerDefinition } from "@/shared/triggers/schema";
import type { ZodNumber } from "zod";
import { z } from "zod";

export abstract class BaseEventTrigger extends BaseTrigger<ZodNumber> {
  abstract kind: string;
  public readonly schema = z.number();

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly count: number
  ) {
    super(spec);
  }

  protected abstract countForEvent(
    context: TriggerContext,
    event: FirehoseEvent
  ): number;

  tick(context: TriggerContext, state: MetaState<number>): boolean {
    state.payload = context.events.reduce(
      (acc, event) => acc + this.countForEvent(context, event),
      state.payload ?? 0
    );
    return state.payload >= this.count;
  }

  abstract serialize(): StoredTriggerDefinition;
}

export class EventTrigger extends BaseEventTrigger {
  public readonly kind = "event";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly eventKind: FirehoseEvent["kind"],
    count: number,
    public readonly predicate?: Matcher
  ) {
    super(spec, count);
  }

  protected countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    return event.kind === this.eventKind &&
      (this.predicate === undefined || matches(this.predicate, event))
      ? 1
      : 0;
  }

  static deserialize(data: any): EventTrigger {
    const spec = zEventStoredTriggerDefinition.parse(data);
    return new EventTrigger(spec, spec.eventKind, spec.count, spec.predicate);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "event",
      eventKind: this.eventKind,
      count: this.count,
      predicate: this.predicate,
    };
  }
}

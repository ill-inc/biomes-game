import type { Delta } from "@/shared/ecs/gen/delta";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import type { ZodTypeAny, z } from "zod";

export interface TriggerContext {
  readonly entity: Delta;
  readonly events: ReadonlyArray<FirehoseEvent>;
  readonly rootId: BiomesId;

  publish(event: FirehoseEvent): void;
  updateState<T extends ZodTypeAny>(
    id: BiomesId,
    schema: T,
    fn: (state: MetaState<z.infer<T>>) => MetaState<z.infer<T>>
  ): MetaState<z.infer<T>>;
  clearState(id: BiomesId): void;
}

export interface Trigger {
  readonly kind: string;
  readonly spec: BaseStoredTriggerDefinition;
  readonly leaf: boolean;
  isEmpty(): boolean;
  serialize(): StoredTriggerDefinition;
  // Typically don't implement this, instead extend BaseTrigger and
  // implement tick()
  update(context: TriggerContext): boolean;
  visit(fn: (trigger: Trigger) => void): void;
}

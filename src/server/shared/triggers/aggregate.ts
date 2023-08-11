import type { Trigger, TriggerContext } from "@/server/shared/triggers/core";
import type { TriggerDeserializer } from "@/server/shared/triggers/serde";
import {
  BaseStatelessTrigger,
  BaseTrigger,
} from "@/server/shared/triggers/trigger";
import {
  secondsSinceEpoch,
  secondsSinceEpochToDate,
} from "@/shared/ecs/config";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import type {
  StoredTriggerDefinition,
  VariantRollType,
} from "@/shared/triggers/schema";
import {
  zAllStoredTriggerDefinition,
  zAnyStoredTriggerDefinition,
  zSeqStoredTriggerDefinition,
  zVariantStoredTriggerDefinition,
} from "@/shared/triggers/schema";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import prand from "pure-rand";

export class AllTrigger extends BaseStatelessTrigger {
  public readonly kind = "all";
  public readonly leaf = false;

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly triggers: Trigger[]
  ) {
    super(spec);
  }

  isEmpty(): boolean {
    return this.triggers.length === 0
      ? true
      : this.triggers.every((t) => t.isEmpty());
  }

  static deserialize(
    data: any,
    leafDeserializer: TriggerDeserializer // Prevents circular import
  ): AllTrigger {
    const spec = zAllStoredTriggerDefinition.parse(data);
    return new AllTrigger(
      spec,
      spec.triggers.map((t) => leafDeserializer(t))
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "all",
      triggers: this.triggers.map((t) => t.serialize()),
    };
  }

  tick(context: TriggerContext) {
    let allOk = true;
    for (const trigger of this.triggers) {
      if (!trigger.update(context)) {
        allOk = false;
      }
    }
    return allOk;
  }

  visit(fn: (trigger: Trigger) => void): void {
    fn(this);
    this.triggers.forEach((t) => t.visit(fn));
  }
}

export class AnyTrigger extends BaseStatelessTrigger {
  public readonly kind = "any";
  public readonly leaf = false;

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly triggers: Trigger[]
  ) {
    super(spec);
  }

  isEmpty(): boolean {
    return this.triggers.length === 0
      ? true
      : this.triggers.every((t) => t.isEmpty());
  }

  static deserialize(
    data: any,
    leafDeserializer: TriggerDeserializer // Prevents circular import
  ): AnyTrigger {
    const spec = zAnyStoredTriggerDefinition.parse(data);
    return new AnyTrigger(
      spec,
      spec.triggers.map((t) => leafDeserializer(t))
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "any",
      triggers: this.triggers.map((t) => t.serialize()),
    };
  }

  tick(context: TriggerContext): boolean {
    return this.triggers.some((t) => t.update(context));
  }

  visit(fn: (trigger: Trigger) => void): void {
    fn(this);
    this.triggers.forEach((t) => t.visit(fn));
  }
}

export class SeqTrigger extends BaseTrigger<typeof zBiomesId> {
  public readonly kind = "seq";
  public readonly schema = zBiomesId;
  public readonly leaf = false;

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly triggers: Trigger[]
  ) {
    super(spec);
  }

  isEmpty(): boolean {
    return this.triggers.length === 0
      ? true
      : this.triggers.every((t) => t.isEmpty());
  }

  static deserialize(
    data: any,
    leafDeserializer: TriggerDeserializer // Prevents circular import
  ): SeqTrigger {
    const spec = zSeqStoredTriggerDefinition.parse(data);
    return new SeqTrigger(
      spec,
      spec.triggers.map((t) => leafDeserializer(t))
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "seq",
      triggers: this.triggers.map((t) => t.serialize()),
    };
  }

  tick(context: TriggerContext, state: MetaState<BiomesId>): boolean {
    if (this.triggers.length === 0) {
      return true;
    }
    const step = state.payload ?? INVALID_BIOMES_ID;
    if (step === this.spec.id) {
      return true;
    }
    let childIndex = this.triggers.findIndex((t) => t.spec.id === step);
    if (childIndex === -1) {
      // No known child, go back to beginning.
      childIndex = 0;
    }

    // Admin manual step progression. Progress one step max, if we come across the magical adminProgressQuestStep event.
    if (
      context.events.find(
        (e) =>
          e.kind === "adminProgressQuestStep" && e.questId === context.rootId
      )
    ) {
      if (this.triggers[childIndex].update(context)) {
        childIndex++;
      }
      if (childIndex >= this.triggers.length) {
        state.payload = this.spec.id;
        return true;
      }
      state.payload = this.triggers[childIndex].spec.id;
      return false;
    }

    while (childIndex < this.triggers.length) {
      const child = this.triggers[childIndex];
      if (!child.update(context)) {
        state.payload = child.spec.id;
        return false;
      }
      childIndex++;
    }
    state.payload = this.spec.id;
    return true;
  }

  visit(fn: (trigger: Trigger) => void): void {
    fn(this);
    this.triggers.forEach((t) => t.visit(fn));
  }
}

export class VariantTrigger extends BaseTrigger<typeof zBiomesId> {
  public readonly kind = "variant";
  public readonly schema = zBiomesId;
  public readonly leaf = false;

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly rollType: VariantRollType,
    public readonly triggers: Trigger[]
  ) {
    super(spec);
  }

  isEmpty(): boolean {
    return this.triggers.length === 0
      ? true
      : this.triggers.every((t) => t.isEmpty());
  }

  static deserialize(
    data: any,
    leafDeserializer: TriggerDeserializer // Prevents circular import
  ): VariantTrigger {
    const spec = zVariantStoredTriggerDefinition.parse(data);
    return new VariantTrigger(
      spec,
      spec.rollType,
      spec.triggers.map((t) => leafDeserializer(t))
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "variant",
      triggers: this.triggers.map((t) => t.serialize()),
      rollType: this.rollType,
    };
  }

  tick(context: TriggerContext, state: MetaState<BiomesId>): boolean {
    if (this.triggers.length === 0) {
      return true;
    }
    const step = state.payload ?? INVALID_BIOMES_ID;
    if (step === this.spec.id) {
      return true;
    }
    let childIndex = this.triggers.findIndex((t) => t.spec.id === step);
    if (childIndex === -1) {
      state.payload = this.roll();
      childIndex = this.triggers.findIndex((t) => t.spec.id === state.payload);
    }
    ok(childIndex !== -1, "Variant child not found");
    const child = this.triggers[childIndex];
    if (!child.update(context)) {
      return false;
    }
    state.payload = this.spec.id;
    return true;
  }

  roll(): BiomesId {
    let idx = 0;
    if (this.rollType === "random") {
      idx = Math.floor(Math.random() * this.triggers.length);
    } else if (this.rollType === "first") {
      idx = 0;
    } else {
      // Random salt: 213
      let seed = this.spec.id + 213;
      const date = secondsSinceEpochToDate(secondsSinceEpoch());
      switch (this.rollType) {
        case "daily":
          date.setUTCHours(0, 0, 0, 0);
          seed += date.getUTCDate();
          break;
        case "weekly":
          date.setUTCDate(date.getUTCDate() - date.getUTCDay());
          seed += date.getUTCDate();
          break;
        case "monthly":
          date.setUTCDate(1);
          seed += date.getUTCDate();
          break;
        default:
          assertNever(this.rollType);
      }
      const rng = prand.xoroshiro128plus(seed);
      idx = prand.uniformIntDistribution(0, this.triggers.length - 1, rng)[0];
    }
    return this.triggers[idx].spec.id;
  }

  visit(fn: (trigger: Trigger) => void): void {
    fn(this);
    this.triggers.forEach((t) => t.visit(fn));
  }
}

import type { ChangeToApply } from "@/shared/api/transaction";
import type { ProposedUpdate } from "@/shared/ecs/change";
import { Emote } from "@/shared/ecs/gen/components";
import type { AnyEvent, AnyHandlerEvent } from "@/shared/ecs/gen/events";
import type { ReadonlyVec3f, Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { dist, dist2 } from "@/shared/math/linear";
import { getNowMs } from "@/shared/util/helpers";
import { isEqual } from "lodash";

class HighFrequencyValue<T> {
  private lastValue?: T;
  private lastUpdate = 0;
  public dirty = false;

  constructor(private readonly diff: (a: T, b: T) => number) {}

  get value(): T | undefined {
    if (this.dirty) {
      return this.lastValue;
    }
  }

  update(value: T | undefined) {
    if (value === undefined) {
      return;
    }
    const now = getNowMs();
    if (
      this.lastValue !== undefined &&
      (now - this.lastUpdate < CONFIG.syncPlayerUpdateRateMs ||
        this.diff(this.lastValue, value) < Number.EPSILON)
    ) {
      return;
    }
    this.lastValue = value;
    this.lastUpdate = now;
    this.dirty = true;
  }
}

export class ShortCircuit {
  private readonly position = new HighFrequencyValue<Vec3f>(dist);
  private readonly rigid_body = new HighFrequencyValue<Vec3f>(dist);
  private readonly orientation = new HighFrequencyValue<Vec2f>(dist2);
  private readonly emote = new HighFrequencyValue<Emote | null>((a, b) =>
    isEqual(a, b) ? 0 : 1
  );

  constructor(_lastApproxPosition?: ReadonlyVec3f) {}

  get dirty() {
    return (
      this.position.dirty ||
      this.rigid_body.dirty ||
      this.orientation.dirty ||
      this.emote.dirty
    );
  }

  clean() {
    this.position.dirty = false;
    this.rigid_body.dirty = false;
    this.orientation.dirty = false;
    this.emote.dirty = false;
  }

  maybeUpdate(ev: AnyEvent): boolean {
    const event = ev as AnyHandlerEvent;
    switch (event.kind) {
      case "moveEvent":
        this.position.update(event.position);
        this.rigid_body.update(event.velocity);
        this.orientation.update(event.orientation);
        return true;
      case "emoteEvent":
        this.emote.update(
          event.emote_type
            ? Emote.create({
                emote_type: event.emote_type,
                emote_start_time: event.start_time,
                emote_expiry_time: event.expiry_time,
                emote_nonce: event.nonce,
                rich_emote_components: event.rich_emote_components,
              })
            : null
        );
        return true;
    }
    return false;
  }

  toChangeToApply(id: BiomesId): ChangeToApply {
    const delta: ProposedUpdate["entity"] = {
      id,
    };
    const events: FirehoseEvent[] = [];
    if (this.position.dirty) {
      delta.position = { v: this.position.value! };
    }
    if (this.rigid_body.dirty) {
      delta.rigid_body = { velocity: this.rigid_body.value! };
    }
    if (this.orientation.dirty) {
      delta.orientation = { v: this.orientation.value! };
    }
    if (this.emote.dirty) {
      delta.emote = this.emote.value;
    }
    return {
      iffs: [[id]],
      changes: [
        {
          kind: "update",
          entity: delta,
        },
      ],
      events,
    };
  }
}

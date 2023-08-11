import type { Change, ProposedChange } from "@/shared/ecs/change";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { Event } from "@/shared/ecs/gen/events";
import type { SerializeTarget } from "@/shared/ecs/gen/json_serde";
import {
  EntitySerde,
  EventSerde,
  SerializeForServer,
} from "@/shared/ecs/gen/json_serde";
import { ChangeSerde } from "@/shared/ecs/serde";
import type { CustomSerializedType } from "@/shared/zrpc/custom_types";
import { makeZodType } from "@/shared/zrpc/custom_types";
import type { ZodType } from "zod";

export class WrappedEvent implements CustomSerializedType<WrappedEvent> {
  constructor(public readonly event: Event) {}

  prepareForZrpc() {
    return EventSerde.serialize(this.event);
  }
}

export const zEvent = makeZodType((val: any) =>
  val instanceof WrappedEvent
    ? val
    : new WrappedEvent(EventSerde.deserialize(val))
);

export class WrappedEntity implements CustomSerializedType<WrappedEntity> {
  constructor(public readonly entity: Entity) {}

  prepareForZrpc() {
    return EntitySerde.serialize(SerializeForServer, this.entity);
  }

  static for(entity: Entity | ReadonlyEntity): WrappedEntity;
  static for(entity?: Entity | ReadonlyEntity): WrappedEntity | undefined;
  static for(entity?: Entity | ReadonlyEntity): WrappedEntity | undefined {
    if (entity) {
      // Hack: Just ignore readonly-ness.
      return new WrappedEntity(entity as Entity);
    }
  }
}

export const zEntity = makeZodType((val: any) =>
  val instanceof WrappedEntity
    ? val
    : new WrappedEntity(EntitySerde.deserialize(val, false))
) as ZodType<WrappedEntity>;

export class WrappedEntityFor extends WrappedEntity {
  constructor(
    private readonly target: SerializeTarget,
    entity: ReadonlyEntity
  ) {
    super(entity as Entity);
  }

  public override prepareForZrpc() {
    return EntitySerde.serialize(this.target, this.entity);
  }
}

export class WrappedChange implements CustomSerializedType<WrappedChange> {
  constructor(public readonly change: Change) {}

  public prepareForZrpc() {
    return ChangeSerde.serialize(SerializeForServer, this.change);
  }
}

export class WrappedChangeFor extends WrappedChange {
  constructor(private readonly target: SerializeTarget, change: Change) {
    super(change);
  }

  public override prepareForZrpc() {
    return ChangeSerde.serialize(this.target, this.change);
  }
}

export const zChange = makeZodType((val: any) =>
  val instanceof WrappedChange
    ? val
    : new WrappedChange(ChangeSerde.deserialize(val))
);

export class WrappedProposedChange
  implements CustomSerializedType<WrappedProposedChange>
{
  constructor(public readonly change: ProposedChange) {}

  public prepareForZrpc() {
    return ChangeSerde.serializeProposed(SerializeForServer, this.change);
  }
}

export const zProposedChange = makeZodType((val: any) =>
  val instanceof WrappedProposedChange
    ? val
    : new WrappedProposedChange(ChangeSerde.deserializeProposed(val))
);

import type { AnyEvent } from "@/shared/ecs/gen/events";
import { EventSerde } from "@/shared/ecs/gen/json_serde";
import type { BiomesId } from "@/shared/ids";
import type { CustomSerializedType } from "@/shared/zrpc/custom_types";
import { makeZodType } from "@/shared/zrpc/custom_types";

export class GameEvent implements CustomSerializedType<GameEvent> {
  constructor(
    public readonly userId: BiomesId,
    public readonly event: AnyEvent
  ) {}

  public serialize() {
    return {
      userId: this.userId,
      event: EventSerde.serialize(this.event),
    };
  }

  public prepareForZrpc() {
    return this.serialize();
  }

  public static deserialize(data: any) {
    return new GameEvent(
      data.userId,
      EventSerde.deserialize(data.event) as AnyEvent
    );
  }
}

export const zGameEvent = makeZodType((val) =>
  val instanceof GameEvent ? val : GameEvent.deserialize(val)
);

import type { Change, ProposedChange } from "@/shared/ecs/change";
import type { AsDelta, Entity } from "@/shared/ecs/gen/entities";
import type { SerializeTarget } from "@/shared/ecs/gen/json_serde";
import { EntitySerde } from "@/shared/ecs/gen/json_serde";
import { parseBiomesId } from "@/shared/ids";
import { isBinaryData, normalizeBinaryData } from "@/shared/util/binary";
import type { JSONable } from "@/shared/util/type_helpers";
import { unpack } from "msgpackr";

export const KIND_TO_ID = {
  delete: 0,
  update: 1,
  create: 2,
};

const ID_TO_KIND: { [key: number]: "update" | "create" | "delete" } = {
  0: "delete",
  1: "update",
  2: "create",
};

function badChange(message: string, data: any): never {
  throw new Error(
    `${message}: ${JSON.stringify(data, (_key, value) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      typeof value === "bigint" ? value.toString() + "n" : value
    )}`
  );
}

export class ChangeSerde {
  static serialize(target: SerializeTarget, change: Change): JSONable;
  static serialize(
    target: SerializeTarget,
    change: ProposedChange,
    forceTick: number
  ): JSONable;
  static serialize(
    target: SerializeTarget,
    change: Change | (ProposedChange & { tick?: number }),
    forceTick?: number
  ): JSONable {
    switch (change.kind) {
      case "delete":
        return [
          KIND_TO_ID[change.kind],
          forceTick ?? change.tick ?? 1,
          change.id,
        ];
      case "create":
        return [
          KIND_TO_ID[change.kind],
          forceTick ?? change.tick ?? 1,
          EntitySerde.serialize(target, change.entity),
        ] as JSONable;
      case "update":
        return [
          KIND_TO_ID[change.kind],
          forceTick ?? change.tick ?? 1,
          EntitySerde.serialize(target, change.entity, true),
        ] as JSONable;
    }
  }

  static serializeProposed(
    target: SerializeTarget,
    change: ProposedChange
  ): JSONable {
    switch (change.kind) {
      case "delete":
        return [KIND_TO_ID[change.kind], change.id];
      case "create":
        return [
          KIND_TO_ID[change.kind],
          EntitySerde.serialize(target, change.entity),
        ] as JSONable;
      case "update":
        return [
          KIND_TO_ID[change.kind],
          EntitySerde.serialize(target, change.entity, true),
        ] as JSONable;
    }
  }

  private static decodeEntityData(
    entityData: unknown,
    decodeDelta: boolean
  ): AsDelta<Entity> | Entity {
    if (typeof entityData === "string") {
      entityData = JSON.parse(entityData);
    } else if (entityData && Array.isArray(entityData)) {
      for (let i = 1; i < entityData.length; i += 2) {
        const value = entityData[i + 1];
        if (isBinaryData(value)) {
          entityData[i + 1] = unpack(normalizeBinaryData(value));
        }
      }
    }

    const entity = EntitySerde.deserialize(entityData, decodeDelta as any);
    if (!entity) {
      badChange("Could not decode entity", entity);
    }
    return entity;
  }

  static deserializeProposed(data: any): ProposedChange {
    if (!Array.isArray(data)) {
      badChange("Expected array", data);
    }
    if (data.length !== 2) {
      badChange("Invalid array length", data);
    }
    if (typeof data[0] !== "number") {
      badChange("Invalid kind", data);
    }
    const kind = ID_TO_KIND[data[0]];
    switch (kind) {
      case "delete":
        return {
          kind: "delete",
          id: parseBiomesId(data[1]),
        };
      case "update":
        return {
          kind: "update",
          entity: ChangeSerde.decodeEntityData(data[1], true),
        };
      case "create":
        return {
          kind: "create",
          entity: ChangeSerde.decodeEntityData(data[1], false) as Entity,
        };
    }
    badChange("Unexpected change kind", data);
  }

  static deserialize(data: any): Change {
    if (typeof data === "string" || typeof data === "number") {
      return { kind: "delete", tick: 1, id: parseBiomesId(data) };
    } else if (!Array.isArray(data)) {
      badChange("Expected array", data);
    }
    if (data.length < 1) {
      badChange("Invalid array length", data);
    }
    if (typeof data[0] !== "number") {
      badChange("Invalid kind", data);
    }
    const kind = ID_TO_KIND[data[0]];
    if (data.length === 2) {
      switch (kind) {
        case "update":
          return {
            kind,
            tick: 1,
            entity: ChangeSerde.decodeEntityData(data[1], true),
          };
        case "create":
          return {
            kind,
            tick: 1,
            entity: ChangeSerde.decodeEntityData(data[1], false) as Entity,
          };
      }
      badChange("Unexpected change kind", data);
    } else if (data.length === 3) {
      if (typeof data[1] !== "number") {
        badChange("Invalid tick", data);
      }
      switch (kind) {
        case "delete":
          return {
            kind,
            tick: data[1],
            id: parseBiomesId(data[2]),
          };
        case "update":
          return {
            kind,
            tick: data[1],
            entity: ChangeSerde.decodeEntityData(data[2], true),
          };
        case "create":
          return {
            kind,
            tick: data[1],
            entity: ChangeSerde.decodeEntityData(data[2], false) as Entity,
          };
      }
      badChange("Unexpected change kind", data);
    } else {
      badChange("Unexpected array length", data);
    }
  }
}

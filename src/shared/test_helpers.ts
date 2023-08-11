import type { Entity } from "@/shared/ecs/gen/entities";
import { zEntity } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { zrpcWebDeserialize } from "@/shared/zrpc/serde";

let nextId = 1 as BiomesId;

export function generateTestId() {
  return nextId++ as BiomesId;
}

export function importEntity(...data: string[]): Entity {
  return zrpcWebDeserialize(data.join(""), zEntity).entity;
}

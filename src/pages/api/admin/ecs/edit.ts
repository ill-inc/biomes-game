import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import {
  AdminECSAddComponentEvent,
  AdminECSDeleteComponentEvent,
} from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zAdminECSEditRequest = z.object({
  id: zBiomesId,
  edit: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("add"),
      field: z.string(),
    }),
    z.object({
      kind: z.literal("delete"),
      field: z.string(),
    }),
    z.object({
      kind: z.literal("edit"),
      field: z.string().array(),
      value: z.any(),
    }),
  ]),
});
export type AdminECSEditRequest = z.infer<typeof zAdminECSEditRequest>;

export const zAdminECSEditResponse = z.object({
  success: z.boolean(),
});
export type AdminECSEditResponse = z.infer<typeof zAdminECSEditResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAdminECSEditRequest,
    response: zAdminECSEditResponse,
  },
  async ({ auth: { userId }, body: { id, edit }, context }) => {
    try {
      if (edit.kind === "delete") {
        // Delete the field.
        await context.logicApi.publish(
          new GameEvent(
            userId,
            new AdminECSDeleteComponentEvent({ id, field: edit.field })
          )
        );
        return { success: true };
      } else if (edit.kind === "add") {
        await context.logicApi.publish(
          new GameEvent(
            userId,
            new AdminECSAddComponentEvent({ id, field: edit.field })
          )
        );
        return { success: true };
      } else if (edit.kind === "edit") {
        // TODO
      }
    } catch (_e) {}

    return { success: false };
  }
);

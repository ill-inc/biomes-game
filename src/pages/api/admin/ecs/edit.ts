import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import {
  AdminECSAddComponentEvent,
  AdminECSDeleteComponentEvent,
  AdminECSUpdateComponentEvent,
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
      kind: z.literal("update"),
      path: z.string().array(),
      value: z.string(),
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
        await context.logicApi.publish(
          new GameEvent(
            userId,
            new AdminECSDeleteComponentEvent({ id, userId, field: edit.field })
          )
        );
      } else if (edit.kind === "add") {
        await context.logicApi.publish(
          new GameEvent(
            userId,
            new AdminECSAddComponentEvent({ id, userId, field: edit.field })
          )
        );
      } else if (edit.kind === "update") {
        await context.logicApi.publish(
          new GameEvent(
            userId,
            new AdminECSUpdateComponentEvent({
              id,
              userId,
              path: edit.path,
              value: edit.value,
            })
          )
        );
      }
      return { success: true };
    } catch (_e) {}

    return { success: false };
  }
);

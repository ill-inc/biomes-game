import { handleCreateOrJoinWebRequest } from "@/server/shared/minigames/util";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zCreateOrJoinMinigameRequest = z.object({
  minigameId: zBiomesId,
});

export type CreateOrJoinMinigameRequest = z.infer<
  typeof zCreateOrJoinMinigameRequest
>;

export const zCreateOrJoinMinigameResponse = z.object({});

export type CreateOrJoinMinigameResponse = z.infer<
  typeof zCreateOrJoinMinigameResponse
>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zCreateOrJoinMinigameRequest,
    response: zCreateOrJoinMinigameResponse,
  },
  async ({ auth: { userId }, context, body: { minigameId } }) => {
    await handleCreateOrJoinWebRequest({ ...context, userId }, minigameId);
    return {};
  }
);

import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zProposedChange } from "@/shared/ecs/zod";
import type { z } from "zod";

const zApplyEcsChangesRequestType = zProposedChange.array();
export type ApplyEcsChangesRequestType = z.infer<
  typeof zApplyEcsChangesRequestType
>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zApplyEcsChangesRequestType,
    zrpc: true,
  },
  async ({ context: { worldApi }, body: wrapped }) => {
    await worldApi.apply({
      changes: wrapped.map((e) => e.change),
    });
  }
);

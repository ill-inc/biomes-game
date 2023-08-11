import { applySourceMapToCallstack } from "@/server/web/source_maps";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zApplySourceMapResponse = z.object({
  outputLines: z.string(),
});

export type ApplySourceMapResponse = z.infer<typeof zApplySourceMapResponse>;

export const zApplySourceMapRequest = z.object({
  inputLines: z.string(),
});

export type ApplySourceMapRequest = z.infer<typeof zApplySourceMapRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zApplySourceMapRequest,
    response: zApplySourceMapResponse,
  },
  async ({ context: { sourceMapCache }, body: { inputLines } }) => {
    return {
      outputLines: await applySourceMapToCallstack(inputLines, sourceMapCache),
    };
  }
);

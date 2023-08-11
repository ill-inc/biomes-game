import type { MetaState } from "@/shared/triggers/base_schema";
import { zMetaState } from "@/shared/triggers/base_schema";
import { prepare } from "@/shared/zrpc/serde";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";
import type { ZodTypeAny, z } from "zod";

const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

export function serializeTriggerState(state: MetaState): string | number {
  return state.payload
    ? packr.pack(prepare(state)).toString("base64")
    : state.firedAt ?? 0;
}

export function deserializeTriggerState<T extends ZodTypeAny>(
  state: string | number | undefined,
  payloadSchema: T
): MetaState<z.infer<T>> {
  if (typeof state === "number") {
    if (state === 0) {
      return {};
    }
    return { firedAt: state };
  } else if (!state) {
    return {};
  }
  const metaWithPayloadSchema = zMetaState.extend({
    payload: payloadSchema.optional(),
  });
  return metaWithPayloadSchema.parse(
    packr.unpack(Buffer.from(state, "base64"))
  );
}

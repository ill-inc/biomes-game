import { log } from "@/shared/logging";
import { zChaseAttackComponent } from "@/shared/npc/behavior/chase_attack";
import { zDamageReactionComponent } from "@/shared/npc/behavior/damage_reaction";
import { zDrownComponent } from "@/shared/npc/behavior/drown";
import { zFarFromHomeComponent } from "@/shared/npc/behavior/far_from_home";
import { zMeanderComponent } from "@/shared/npc/behavior/meander";
import { zReturnHomeComponent } from "@/shared/npc/behavior/return_home";
import { zRotateTargetComponent } from "@/shared/npc/behavior/rotate_target";
import { zSocializeComponent } from "@/shared/npc/behavior/socialize";
import { pack, unpack } from "msgpackr";
import { z } from "zod";

export const zDeserializedNpcState = z
  .object({})
  .merge(zRotateTargetComponent)
  .merge(zDrownComponent)
  .merge(zMeanderComponent)
  .merge(zFarFromHomeComponent)
  .merge(zChaseAttackComponent)
  .merge(zDamageReactionComponent)
  .merge(zReturnHomeComponent)
  .merge(zSocializeComponent)
  .partial()
  .default({});

export type DeserializedNpcState = z.infer<typeof zDeserializedNpcState>;

export function deserializeNpcCustomState(
  encoded: Uint8Array | undefined,
  options?: { propagateParseError?: boolean }
): DeserializedNpcState {
  if (encoded === undefined) {
    return zDeserializedNpcState.parse(undefined);
  }

  try {
    return zDeserializedNpcState.parse(unpack(encoded));
  } catch (error) {
    if (options?.propagateParseError) {
      throw error;
    }
    // If an error occurs while deserializing, just return the default.
    log.warn(
      `Resetting state to default due to error while parsing NPC state: ${error}`
    );
    return zDeserializedNpcState.parse(undefined);
  }
}

export function serializeNpcCustomState<T extends z.ZodDefault<z.ZodTypeAny>>(
  decoded: z.infer<T>
) {
  return pack(decoded);
}

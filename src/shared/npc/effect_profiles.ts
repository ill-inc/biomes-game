import { assetPaths } from "@/galois/interface/asset_paths";

import * as z from "zod";

export const zSoundEffectAsset = z.enum(
  assetPaths().filter((x) => x.startsWith("audio/")) as [string, ...string[]]
);
export type SoundEffectAsset = z.infer<typeof zSoundEffectAsset>;

export const zSoundEffectAssetWithDefault = zSoundEffectAsset.default(
  "audio/block-break-3"
);

export const zSoundEffectAssetArrayWithDefault = z
  .array(zSoundEffectAssetWithDefault)
  .default([]);

export const zNpcEffectProfile = z
  .object({
    onHitSound: zSoundEffectAssetArrayWithDefault
      .optional()
      .describe("Sound effect played when the NPC is damaged."),
    onAttackSound: zSoundEffectAssetArrayWithDefault
      .optional()
      .describe("Sound effect played when the NPC attacks."),
    onDeathSound: zSoundEffectAssetArrayWithDefault
      .optional()
      .describe("Sound effect played when the NPC is killed."),
    idleSound: zSoundEffectAssetArrayWithDefault
      .optional()
      .describe(
        "The sound effect to play every time the NPC enters the idle animation."
      ),
  })
  .strict();

export type NpcEffectProfile = z.infer<typeof zNpcEffectProfile>;

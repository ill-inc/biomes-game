import * as z from "zod";

const zBehaviorMeanderParams = z
  .object({
    // The meander speed of the NPC.
    stayDistanceFromSpawn: z
      .number()
      .default(24)
      .optional()
      .describe(
        "If the NPC finds itself this many voxels away from where it spawned, it will meander in a direction that takes it back to its spawn point."
      ),
  })
  .default({});
export type BehaviorMeanderParams = z.infer<typeof zBehaviorMeanderParams>;

const zBehaviorSwimParams = z
  .object({
    shouldFlock: z
      .object({
        towardsOtherEntitiesRadius: z
          .number()
          .describe("Distance until the flocking force kicks in."),
        attractOtherEntitiesStrength: z
          .number()
          .describe("Strength of the force to attract other entities."),
        followOtherEntitiesStrength: z
          .number()
          .describe(
            "Strength of the force to follow other entities direction."
          ),
      })
      .optional()
      .describe("NPC flocks with other NPCs of the same type"),
    isShyOfPlayers: z
      .object({
        awayFromPlayerRadius: z
          .number()
          .describe(
            "Distance until the force repelling from players kicks in."
          ),
        awayFromPlayerStrength: z
          .number()
          .describe("Strength of the force repelling from players."),
      })
      .optional()
      .describe("NPC runs away if the player gets close."),

    towardsCurrentDirectionStrength: z
      .number()
      .describe("Strength of the force to keep current direction."),

    awayFromBlocksAndBoundsRadius: z
      .number()
      .describe(
        "Distance until the force repelling from blocks/world bounds kicks in."
      ),
    awayFromBlocksAndBoundsStrength: z
      .number()
      .describe("Strength of the force repelling from blocks/world bounds."),

    stayInWaterStrength: z
      .number()
      .describe("Strength of the force keeping the entity in the water."),

    randomForceProbability: z
      .number()
      .describe("The probability that a random force is applied for a tick."),
    randomForceStrength: z.number().describe("Strength of the random force."),
  })
  .default({
    towardsCurrentDirectionStrength: 1,
    awayFromBlocksAndBoundsRadius: 3,
    awayFromBlocksAndBoundsStrength: 0.4,
    stayInWaterStrength: 1,
    randomForceProbability: 0.005,
    randomForceStrength: 4,
  });
export type BehaviorSwimParams = z.infer<typeof zBehaviorSwimParams>;

const zBehaviorFlyParams = z
  .object({
    awayFromPlayerRadius: z
      .number()
      .describe("Distance until the force repelling from players kicks in."),
    awayFromPlayerStrength: z
      .number()
      .describe("Strength of the force repelling from players."),

    towardsCurrentDirectionStrength: z
      .number()
      .describe("Strength of the force to keep current direction."),

    awayFromBlocksAndBoundsRadius: z
      .number()
      .describe(
        "Distance until the force repelling from blocks/world bounds kicks in."
      ),
    awayFromBlocksAndBoundsStrength: z
      .number()
      .describe("Strength of the force repelling from blocks/world bounds."),

    randomForceProbability: z
      .number()
      .describe("The probability that a random force is applied for a tick."),
    randomForceStrength: z.number().describe("Strength of the random force."),

    optimalDistanceFromGround: z
      .number()
      .describe("How many voxels from the ground is optimal."),

    stayDistanceFromSpawn: z
      .number()
      .describe(
        "Max distance away from spawn point until it starts to fly back"
      ),
    towardsSpawnStrength: z
      .number()
      .describe(
        "Strength of the force that brings NPC back to its spawn point"
      ),

    oscillate: z
      .object({
        periodSeconds: z
          .number()
          .describe("The period of one oscillation in seconds."),
        strength: z.number().describe("Strength of the oscillation force."),
      })
      .optional()
      .describe(""),
  })
  .default({
    awayFromPlayerRadius: 10,
    awayFromPlayerStrength: 0.2,

    towardsCurrentDirectionStrength: 1,

    awayFromBlocksAndBoundsRadius: 2,
    awayFromBlocksAndBoundsStrength: 0.4,

    randomForceProbability: 0.01,
    randomForceStrength: 3,

    stayDistanceFromSpawn: 100,
    towardsSpawnStrength: 0.1,

    optimalDistanceFromGround: 5,
  });
export type BehaviorFlyParams = z.infer<typeof zBehaviorFlyParams>;

const zBehaviorSizeVariationParams = z
  .object({
    mean: z.number().default(1).describe("Mean variation of the size."),
    lowerBound: z
      .number()
      .default(1)
      .describe(
        "Lower bound on the variation of the size (0.5 means the smallest is half the default size)."
      ),
    upperBound: z
      .number()
      .default(1)
      .describe(
        "Upper bound on the variation of the size (2 means largest is double the default size)."
      ),
    variance: z.number().default(0).describe("Variance of the size."),
  })
  .default({});
export type BehaviorSizeVariationParams = z.infer<
  typeof zBehaviorSizeVariationParams
>;

const zBehaviorHideNameOverlayParams = z
  .object({
    hideNameOverlay: z
      .boolean()
      .default(false)
      .describe("Hides the name overlay for the NPC."),
  })
  .default({});
export type BehaviorHideNameOverlayParams = z.infer<
  typeof zBehaviorHideNameOverlayParams
>;

const zBehaviorChaseAttackParams = z
  .object({
    aggroTrigger: z
      .union([
        z
          .object({
            kind: z.literal("proximity"),
            distance: z
              .number()
              .describe(
                "The NPC will start chasing any target that comes within this many voxels."
              ),
          })
          .describe(
            `The NPC will attack any potential target that gets near it.`
          )
          .default({ kind: "proximity", distance: 16 }),
        z
          .object({
            kind: z.literal("onlyIfAttacked"),
          })
          .describe(`The NPC will only attack targets that first attack it.`)
          .default({ kind: "onlyIfAttacked" }),
      ])
      .describe(`Describes what triggers the NPC to attack a target.`),
    disengageDistance: z
      .number()
      .gte(0)
      .describe(
        "This value decides the distance at which the NPC will stop chasing a target."
      ),
    attackDistance: z
      .number()
      .describe(
        "The NPC will be able to attack if it is within at least this distance from its target."
      ),
    attackAnimationMultiplier: z
      .number()
      .describe(
        "The NPC's attack animation will be scaled by this factor. The gameplay implications of increasing this are that the moment of strike will come sooner after the attack begins, but othewise adjust attackIntervalSecs to modify the NPC's DPS."
      ),
    attackStrikeMomentSecs: z
      .number()
      .describe(
        "This many seconds after NPC has started to attack is when the damage will actually be dealt. This value is multiplied by the attack animation multiplier. This property should be tweaked if the attack animation is tweaked."
      ),
    attackIntervalSecs: z
      .number()
      .describe("The NPC will wait this many seconds between each attack."),
    attackFovDeg: z
      .number()
      .describe(
        "The NPC can attack as long as it is within this many degrees of facing its target."
      ),
    attackDamage: z
      .number()
      .describe(
        "The number of hitpoints that will be removed from the target per attack."
      ),
  })
  .refine(
    (x) =>
      x.aggroTrigger.kind !== "proximity" ||
      x.aggroTrigger.distance <= x.disengageDistance,
    "Chase attack disengage distance must be at least as large as the proximity aggro trigger distance."
  )
  .default({
    aggroTrigger: { kind: "proximity", distance: 16 },
    disengageDistance: 16,
    attackDistance: 1.8,
    attackAnimationMultiplier: 1,
    attackStrikeMomentSecs: 0.5,
    attackIntervalSecs: 2,
    attackFovDeg: 5,
    attackDamage: 10,
  });
export type BehaviorChaseAttackParams = z.infer<
  typeof zBehaviorChaseAttackParams
>;

const zBehaviorQuestGiverParams = z
  .object({
    beamPosition: z
      .tuple([z.number(), z.number(), z.number()])
      .default([0, 0, 0])
      .optional(),
  })
  .default({});
export type BehaviorQuestGiverParams = z.infer<
  typeof zBehaviorQuestGiverParams
>;

const zBehaviorDamageableParams = z
  .object({
    maxHp: z
      .number()
      .min(1)
      .describe("The number of hitpoints the NPC spawns with."),
    attackable: z
      .boolean()
      .describe("If set to false, the NPC is unattackable."),
  })
  .default({ maxHp: 100, attackable: true });
export type BehaviorDamageableParams = z.infer<
  typeof zBehaviorDamageableParams
>;

const zBehaviorSocializeParams = z
  .object({
    minMeetingDuration: z
      .number()
      .describe("Minimum amount of time an NPC with spend with another NPC."),
    maxMeetingDuration: z
      .number()
      .describe("Maximum amount of time an NPC with spend with another NPC."),
    searchRadius: z
      .number()
      .min(0)
      .describe("The maximum distance the NPC will look for a friend."),
  })
  .default({
    minMeetingDuration: 3,
    maxMeetingDuration: 10,
    searchRadius: 130,
  });
export type BehaviorSocializeParams = z.infer<typeof zBehaviorSocializeParams>;

export const zBehavior = z.object({
  meander: zBehaviorMeanderParams
    .optional()
    .describe(
      "Makes the NPC idly walk around if it has nothing more pressing to do."
    ),
  swim: zBehaviorSwimParams.optional().describe("Makes the NPC swim in water."),
  fly: zBehaviorFlyParams.optional().describe("Makes the NPC fly."),
  chaseAttack: zBehaviorChaseAttackParams
    .optional()
    .describe(
      "NPCs with this behavior will chase and attack players that get close enough to them."
    ),
  questGiver: zBehaviorQuestGiverParams
    .optional()
    .describe(
      "A special behavior that marks this NPC as a quest giver that the player can interact with."
    ),
  damageable: zBehaviorDamageableParams
    .optional()
    .describe("NPCs without this behavior cannot take damage or be killed."),
  sizeVariation: zBehaviorSizeVariationParams
    .optional()
    .describe("The variation from the default box size that NPCs have"),
  hideNameOverlay: zBehaviorHideNameOverlayParams
    .optional()
    .describe("Hides the name overlay for the NPC."),
  socialize: zBehaviorSocializeParams
    .optional()
    .describe("Makes the NPC walk around and interact with other NPCs."),
});

export type Behavior = z.infer<typeof zBehavior>;

export type MovementType = "crouching" | "swimming" | "flying" | "walking";

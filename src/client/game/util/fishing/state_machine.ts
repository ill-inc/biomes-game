import { getOwnedItems } from "@/client/components/inventory/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import {
  isNonCollidingTerrainAtPosition,
  isTerrainAtPosition,
  isWaterAtPosition,
} from "@/client/game/helpers/blueprint";
import { physicsHookPosition } from "@/client/game/util/fishing/helpers";
import type { FishingInfoCatchType } from "@/client/game/util/fishing/params";
import {
  DEFAULT_RETRY_DELAY,
  MISSED_BITE_RETRY_DELAY,
  genDrop,
  genDunceDrop,
} from "@/client/game/util/fishing/params";
import type { FishMinigameAdjustments } from "@/shared/bikkie/schema/types";
import { PHYSICS_EMOTE_GRAVITY } from "@/shared/constants";
import type {
  ItemBag,
  OwnedItemReference,
  Vec3f,
} from "@/shared/ecs/gen/types";
import type { OwnedItems } from "@/shared/game/inventory";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { createBag } from "@/shared/game/items";
import { inCave } from "@/shared/game/players";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import { add, normalizev, scale } from "@/shared/math/linear";
import { lerp } from "@/shared/math/math";
import type { ReadonlyVec3 } from "@/shared/math/types";
import {
  anyMapValue,
  compactMap,
  onlyMapValue,
} from "@/shared/util/collections";

export type ReadyToCastFishingInfo = {
  state: "ready_to_cast";
  start: number;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type ChargingCastFishingInfo = {
  state: "charging_cast";
  start: number;
  powerPct: number;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type CastingFishingInfo = {
  state: "casting";
  start: number;
  lastTick: number;

  hookInitialVelocity: Vec3f;
  hookGravity: Vec3f;
  hookStart: Vec3f;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type WaitingForBiteFishingInfo = {
  state: "waiting_for_bite";
  start: number;
  surfacePosition: Vec3f;

  contents: ItemBag;
  catchType: FishingInfoCatchType;

  timeToBite: number;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type BiteFishingInfo = {
  state: "bite";
  start: number;
  surfacePosition: Vec3f;

  contents: ItemBag;
  catchType: FishingInfoCatchType;

  biteDuration: number;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type CatchGameFishingInfo = {
  state: "catching";
  start: number;

  contents: ItemBag;
  catchType: FishingInfoCatchType;

  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;

  fishPosition: number;
  fishVelocity: number;

  lastTick: number;

  catchBarPosition: number;
  catchBarSize: number;
  catchBarVelocity: number;

  catchMeterPercentage: number;

  surfacePosition: Vec3f;
  inMuck: boolean;
  inCave: boolean;
};

export type CaughtReelingInFishingInfo = {
  state: "caught_reeling_in";
  start: number;
  catchTime: number;
  t: number;

  surfacePosition: Vec3f;
  contents: ItemBag;
  catchType: FishingInfoCatchType;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type CaughtFishingInfo = {
  state: "caught";
  start: number;
  catchTime: number;
  contents: ItemBag;
  catchType: FishingInfoCatchType;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
};

export type FailedFishingInfo = {
  state: "failed";
  start: number;
  catchTime: number;
  rodItemRef: OwnedItemReference | undefined;
  baitItemRef: OwnedItemReference | undefined;
  retryDelay?: number | undefined;
};

export type FishingInfo =
  | ReadyToCastFishingInfo
  | ChargingCastFishingInfo
  | CastingFishingInfo
  | WaitingForBiteFishingInfo
  | BiteFishingInfo
  | CatchGameFishingInfo
  | CaughtReelingInFishingInfo
  | CaughtFishingInfo
  | FailedFishingInfo;

function getFishingParameterAdjustments(
  param: keyof FishMinigameAdjustments,
  ownedItems: OwnedItems,
  info:
    | FishingInfo & {
        contents?: ItemBag;
        rodItemRef?: OwnedItemReference;
        baitItemRef?: OwnedItemReference;
      }
) {
  const wearing = ownedItems.wearing?.items.values() ?? [];
  const fish =
    info.contents && info.contents.size === 1
      ? onlyMapValue(info.contents)?.item
      : undefined;
  const rod = maybeGetSlotByRef(ownedItems, info.rodItemRef)?.item;
  const bait = maybeGetSlotByRef(ownedItems, info.baitItemRef)?.item;
  const mapped = compactMap(
    [fish, rod, bait, ...wearing],
    (item) => item?.fishMinigameAdjustments?.[param]
  );
  // For now, all of these are additive numbers, so just give the final summed number
  return mapped.reduce((a, b) => a + b, 0);
}

export function handleFishAction(
  deps: ClientContextSubset<"resources" | "userId" | "voxeloo">,
  isPrimaryHeld: boolean,
  fishingInfo: FishingInfo | undefined
): FishingInfo | undefined {
  const terrainCollidesAtPosition = (pos: ReadonlyVec3) =>
    !isNonCollidingTerrainAtPosition(resources, [...pos]);

  const { resources, userId } = deps;
  const terrainHelper = TerrainHelper.fromResources(deps.voxeloo, resources);

  const secondsSinceEpoch = resources.get("/clock").time;
  const cursor = resources.get("/scene/cursor");
  const tweaks = resources.get("/tweaks");
  const localPlayer = resources.get("/scene/local_player");
  const selection = resources.get("/hotbar/selection");
  const rod = selection.item;
  const playerPosition = localPlayer.player.position;
  const catchMinigameParams = tweaks.fishingCatchMinigameParams;
  const chargingCastParams = tweaks.fishingChargingCastParams;
  const isClicking = isPrimaryHeld;

  if (!fishingInfo) {
    return {
      start: secondsSinceEpoch,
      state: "ready_to_cast",
      rodItemRef: undefined,
      baitItemRef: undefined,
    };
  }

  switch (fishingInfo.state) {
    case "ready_to_cast": {
      if (isClicking) {
        return {
          start: secondsSinceEpoch,
          state: "charging_cast",
          powerPct: 0,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }

      return {
        state: "ready_to_cast",
        rodItemRef: fishingInfo.rodItemRef,
        baitItemRef: fishingInfo.baitItemRef,
        start: fishingInfo.start,
      };
    }
    case "charging_cast":
      {
        const startCastPosition: Vec3f = [...add(playerPosition, [0, 1.0, 0])];
        if (!isClicking) {
          if (secondsSinceEpoch - fishingInfo.start < 0.2) {
            return {
              state: "ready_to_cast",
              rodItemRef: fishingInfo.rodItemRef,
              baitItemRef: fishingInfo.baitItemRef,
              start: secondsSinceEpoch,
            };
          }
          let hookVelocity = add(cursor.dir, [
            0,
            chargingCastParams.extraUpVector,
            0,
          ]);
          hookVelocity = scale(
            chargingCastParams.powerIntercept +
              chargingCastParams.powerScaling * fishingInfo.powerPct,
            normalizev(hookVelocity)
          );

          return {
            start: secondsSinceEpoch,
            state: "casting",
            lastTick: secondsSinceEpoch,
            hookStart: startCastPosition,
            hookInitialVelocity: hookVelocity,
            hookGravity: [...PHYSICS_EMOTE_GRAVITY],
            rodItemRef: fishingInfo.rodItemRef,
            baitItemRef: fishingInfo.baitItemRef,
          };
        }

        const elapsed = secondsSinceEpoch - fishingInfo.start;
        let powerPct =
          (elapsed % chargingCastParams.fullPowerDuration) /
          chargingCastParams.fullPowerDuration;
        if (
          (elapsed % (chargingCastParams.fullPowerDuration * 2)) /
            chargingCastParams.fullPowerDuration >
          1.0
        ) {
          powerPct = 1 - powerPct;
        }

        return {
          start: fishingInfo.start,
          state: "charging_cast",
          powerPct,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }
      break;

    case "casting":
      {
        const dt = secondsSinceEpoch - fishingInfo.start;
        const hookPosition = physicsHookPosition(
          fishingInfo.hookStart,
          fishingInfo.hookInitialVelocity,
          fishingInfo.hookGravity,
          dt
        );
        if (isWaterAtPosition(resources, hookPosition)) {
          const [catchType, contents] = genDrop(
            deps,
            hookPosition,
            fishingInfo.rodItemRef,
            fishingInfo.baitItemRef
          );
          const timeToBite = Math.max(
            lerp(
              tweaks.fishingBiteParams.biteMinTime,
              tweaks.fishingBiteParams.biteMaxTime,
              Math.random()
            ) +
              getFishingParameterAdjustments(
                "biteTimeOffset",
                getOwnedItems(resources, userId),
                { ...fishingInfo, contents }
              ),
            0
          );

          return {
            state: "waiting_for_bite",
            start: secondsSinceEpoch,
            surfacePosition: hookPosition,
            timeToBite,
            rodItemRef: fishingInfo.rodItemRef,
            baitItemRef: fishingInfo.baitItemRef,
            catchType,
            contents,
          };
        }

        if (
          isTerrainAtPosition(resources, hookPosition) &&
          terrainCollidesAtPosition(hookPosition)
        ) {
          return {
            state: "failed",
            start: secondsSinceEpoch,
            catchTime: secondsSinceEpoch - fishingInfo.start,
            rodItemRef: fishingInfo.rodItemRef,
            baitItemRef: fishingInfo.baitItemRef,
          };
        }

        return {
          state: "casting",
          start: fishingInfo.start,
          lastTick: secondsSinceEpoch,
          hookStart: fishingInfo.hookStart,
          hookGravity: fishingInfo.hookGravity,
          hookInitialVelocity: fishingInfo.hookInitialVelocity,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }
      break;

    case "waiting_for_bite": {
      if (
        fishingInfo.timeToBite >= 0 &&
        secondsSinceEpoch - fishingInfo.start >= fishingInfo.timeToBite
      ) {
        const biteDuration = Math.max(
          lerp(
            tweaks.fishingBiteParams.biteMinDuration,
            tweaks.fishingBiteParams.biteMaxDuration,
            Math.random()
          ) +
            getFishingParameterAdjustments(
              "biteDurationOffset",
              getOwnedItems(resources, userId),
              fishingInfo
            ),
          0
        );
        return {
          state: "bite",
          start: secondsSinceEpoch,
          surfacePosition: fishingInfo.surfacePosition,
          biteDuration,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
          catchType: fishingInfo.catchType,
          contents: fishingInfo.contents,
        };
      }

      if (isClicking) {
        let contents: ItemBag;
        let catchType: FishingInfoCatchType;
        if (fishingInfo.timeToBite < 0) {
          contents = genDunceDrop();
          catchType = "dunce";
        } else {
          contents = createBag();
          catchType = "empty";
        }
        return {
          state: "caught_reeling_in",
          start: secondsSinceEpoch,
          catchTime: secondsSinceEpoch - fishingInfo.start,
          surfacePosition: fishingInfo.surfacePosition,
          t: 0,
          contents,
          catchType,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }

      return {
        ...fishingInfo,
      };
    }

    case "bite": {
      if (secondsSinceEpoch - fishingInfo.start > fishingInfo.biteDuration) {
        return {
          state: "failed",
          start: secondsSinceEpoch,
          catchTime: secondsSinceEpoch - fishingInfo.start,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
          retryDelay: MISSED_BITE_RETRY_DELAY,
        };
      }
      if (isClicking) {
        const catchBarSize =
          (rod?.catchBarSize ?? 0.1) +
          getFishingParameterAdjustments(
            "barSizeOffset",
            getOwnedItems(resources, userId),
            fishingInfo
          );
        const inMuck = terrainHelper.isMucky(fishingInfo.surfacePosition);
        const skyOcclusion = terrainHelper.getSkyOcclusion(
          fishingInfo.surfacePosition
        );
        return {
          state: "catching",
          start: fishingInfo.start,
          fishPosition: catchMinigameParams.fishStartLocation,
          fishVelocity: 0,

          catchType: fishingInfo.catchType,
          contents: fishingInfo.contents,
          surfacePosition: fishingInfo.surfacePosition,

          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,

          lastTick: secondsSinceEpoch,
          catchMeterPercentage: catchMinigameParams.fillBarStart,
          catchBarPosition: 0.2 / 2,
          catchBarSize,
          catchBarVelocity: 0,
          inMuck,
          inCave: inCave(skyOcclusion),
        };
      }

      return {
        state: "bite",
        start: fishingInfo.start,
        surfacePosition: fishingInfo.surfacePosition,
        biteDuration: fishingInfo.biteDuration,
        rodItemRef: fishingInfo.rodItemRef,
        baitItemRef: fishingInfo.baitItemRef,
        catchType: fishingInfo.catchType,
        contents: fishingInfo.contents,
      };
    }

    case "catching": {
      const dt = secondsSinceEpoch - fishingInfo.lastTick;
      // It got away
      if (fishingInfo.catchMeterPercentage < 0.0) {
        return {
          state: "failed",
          start: secondsSinceEpoch,
          catchTime: secondsSinceEpoch - fishingInfo.start,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }

      if (fishingInfo.catchMeterPercentage >= 1.0) {
        return {
          state: "caught_reeling_in",
          start: secondsSinceEpoch,
          catchTime: secondsSinceEpoch - fishingInfo.start,
          t: 0,
          surfacePosition: fishingInfo.surfacePosition,
          contents: fishingInfo.contents,
          catchType: fishingInfo.catchType,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }

      const accel = isPrimaryHeld
        ? catchMinigameParams.catchBarAccelerationClicked
        : catchMinigameParams.catchBarAccelerationUnclicked;
      let newVelocity = fishingInfo.catchBarVelocity + accel * dt;
      let newPos = fishingInfo.catchBarPosition + newVelocity * dt;
      if (newPos + fishingInfo.catchBarSize / 2 >= 1.0) {
        newPos = 1.0 - fishingInfo.catchBarSize / 2;
        newVelocity = 0.0;
      } else if (newPos - fishingInfo.catchBarSize / 2 <= 0.0) {
        newPos = fishingInfo.catchBarSize / 2;
        newVelocity =
          -newVelocity * catchMinigameParams.catchBarBottomSpringCoefficient;
      }
      if (fishingInfo.contents.size !== 1) {
        return {
          state: "failed",
          start: secondsSinceEpoch,
          catchTime: secondsSinceEpoch - fishingInfo.start,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }

      const heroItem = onlyMapValue(fishingInfo.contents);
      const fishLength = heroItem.item.fishLength ?? 0;
      const ownedItems = getOwnedItems(resources, userId);

      const fishRandomWalk = Math.random() > 0.5 ? 1.0 : -1.0;
      const fishTickMovement =
        catchMinigameParams.fishRandomWalkVelocityPerSecondIntercept +
        catchMinigameParams.fishRandomWalkVelocityPerSecondIntercept *
          fishLength +
        getFishingParameterAdjustments(
          "velocityOffset",
          ownedItems,
          fishingInfo
        );
      let newFishVelocity =
        fishingInfo.fishVelocity + fishRandomWalk * fishTickMovement * dt;
      let newFishPos = fishingInfo.fishPosition + newFishVelocity * dt;
      if (newFishPos <= 0.1) {
        newFishPos = 0.1;
        newFishVelocity = Math.max(0, newFishVelocity);
      } else if (newFishPos >= 0.9) {
        newFishPos = 0.9;
        newFishVelocity = Math.min(0, newFishVelocity);
      }

      let newBarAmount = fishingInfo.catchMeterPercentage;
      const isFilling =
        newFishPos >= newPos - fishingInfo.catchBarSize / 2 &&
        newFishPos <= newPos + fishingInfo.catchBarSize / 2;

      const barScale =
        catchMinigameParams.fillBarSizeIntercept +
        catchMinigameParams.fillBarSizeFishLengthScaling * fishLength;

      newBarAmount += isFilling
        ? Math.max(
            catchMinigameParams.fillBarIncreasePerSecond / barScale +
              getFishingParameterAdjustments(
                "barFillIncreaseOffset",
                ownedItems,
                fishingInfo
              ),
            0
          ) * dt
        : Math.min(
            catchMinigameParams.fillBarDecreasePerSecond / barScale +
              getFishingParameterAdjustments(
                "barFillDecreaseOffset",
                ownedItems,
                fishingInfo
              ),
            0
          ) * dt;
      // Deprecated; use the increase/decrease ones instead. Remove this once attributes migrated.
      newBarAmount += getFishingParameterAdjustments(
        "barFillOffset",
        ownedItems,
        fishingInfo
      );

      return {
        state: "catching",
        contents: fishingInfo.contents,
        start: fishingInfo.start,
        surfacePosition: fishingInfo.surfacePosition,

        rodItemRef: fishingInfo.rodItemRef,
        baitItemRef: fishingInfo.baitItemRef,

        catchBarPosition: newPos,
        catchBarSize: fishingInfo.catchBarSize,
        catchBarVelocity: newVelocity,
        catchMeterPercentage: newBarAmount,
        fishPosition: newFishPos,
        fishVelocity: newFishVelocity,
        lastTick: secondsSinceEpoch,
        catchType: fishingInfo.catchType,
        inMuck: fishingInfo.inMuck,
        inCave: fishingInfo.inCave,
      };
    }

    case "caught_reeling_in": {
      if (fishingInfo.t >= 1.0) {
        // If you catch nothing, go straight back
        if (anyMapValue(fishingInfo.contents) === undefined) {
          return {
            state: "ready_to_cast",
            rodItemRef: fishingInfo.rodItemRef,
            baitItemRef: fishingInfo.baitItemRef,
            start: secondsSinceEpoch,
          };
        }

        return {
          state: "caught",
          contents: fishingInfo.contents,
          start: secondsSinceEpoch,
          catchType: fishingInfo.catchType,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
          catchTime: fishingInfo.catchTime,
        };
      }
      return {
        ...fishingInfo,
        t: secondsSinceEpoch - fishingInfo.start,
      };
    }

    case "caught": {
      return fishingInfo;
    }

    case "failed": {
      const retryDelay = fishingInfo.retryDelay ?? DEFAULT_RETRY_DELAY;
      if (isPrimaryHeld && secondsSinceEpoch - fishingInfo.start > retryDelay) {
        return {
          start: secondsSinceEpoch,
          state: "charging_cast",
          powerPct: 0,
          rodItemRef: fishingInfo.rodItemRef,
          baitItemRef: fishingInfo.baitItemRef,
        };
      }
      return fishingInfo;
    }
  }

  return undefined;
}

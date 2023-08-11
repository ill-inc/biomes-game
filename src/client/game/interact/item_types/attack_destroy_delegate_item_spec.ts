import type { ClientContextSubset } from "@/client/game/context";
import type { BuildAction } from "@/client/game/helpers/blueprint";
import {
  checkActionAllowedIfBlueprintVoxel,
  getBlueprintAtPosition,
  isBlueprintEmpty,
  isTerrainAtPosition,
} from "@/client/game/helpers/blueprint";
import { plantExperimentalAt } from "@/client/game/helpers/farming";
import { groupOccupancyAt } from "@/client/game/helpers/occupancy";
import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import {
  actuallyDestroyPlaceable,
  changeRadius,
  destroyBlueprint,
  destroyGroup,
  destroyTerrain,
  handleAttackInteraction,
  handleInteractionError,
  shapeTerrain,
} from "@/client/game/interact/helpers";
import type { LegacyInteractOutput } from "@/client/game/interact/item_types/attack_destroy_delegate_item_helpers";
import {
  destroyOrShapeTerrain,
  destroyPlaceable,
  isAttacking,
} from "@/client/game/interact/item_types/attack_destroy_delegate_item_helpers";
import type {
  ClickableItemInfo,
  ClickableItemSpec,
} from "@/client/game/interact/item_types/clickable_item_script";
import type {
  ActionType,
  ActiveAction,
  AttackInfo,
  DestroyInfo,
} from "@/client/game/interact/types";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { AclAction, Item } from "@/shared/ecs/gen/types";
import {
  attackIntervalSeconds,
  blockDestructionTimeMs,
  groupDestructionTimeMs,
  groupHardnessClass,
} from "@/shared/game/damage";
import { anItem } from "@/shared/game/item";
import { allowPlaceableDestruction } from "@/shared/game/placeables";
import { hitExistingTerrain } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { TimeWindow } from "@/shared/util/throttling";
import { ok } from "assert";

export type AttackDestroyDelegateHandler = (
  itemInfo: ClickableItemInfo
) => boolean;

export interface AttackDestroyDelegateSpec {
  onSelected?: AttackDestroyDelegateHandler;
  onUnselected?: AttackDestroyDelegateHandler;
  allowsPrimaryDelegation?: AttackDestroyDelegateHandler;
  onPrimaryDown?: AttackDestroyDelegateHandler;
  onPrimaryHoldTick?: AttackDestroyDelegateHandler;
  onPrimaryUp?: AttackDestroyDelegateHandler;
  allowsSecondaryDelegation?: AttackDestroyDelegateHandler;
  onSecondaryDown?: AttackDestroyDelegateHandler;
  onSecondaryHoldTick?: AttackDestroyDelegateHandler;
  onSecondaryUp?: AttackDestroyDelegateHandler;
  onTick?: AttackDestroyDelegateHandler;
}

export type AttackDestroyDelegateDeps = ClientContextSubset<
  | "userId"
  | "input"
  | "table"
  | "resources"
  | "events"
  | "audioManager"
  | "permissionsManager"
  | "gardenHose"
  | "voxeloo"
> & {
  actionThrottler: TimeWindow<ActionType>;
};

export class AttackDestroyDelegateItemSpec implements ClickableItemSpec {
  responsibleForPrimary: boolean = false;
  responsibleForSecondary: boolean = false;

  // This allows us to keep the wacking animation if you are holding and destroying multiple things
  private cancelWackTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly deps: AttackDestroyDelegateDeps,
    readonly attackDestroySpec: AttackDestroyDelegateSpec
  ) {}

  onUnselected(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      this.attackDestroySpec.onUnselected?.(itemInfo);
    });
  }

  onSelected(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      this.attackDestroySpec.onSelected?.(itemInfo);
    });
  }

  onTick(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      this.attackDestroySpec.onTick?.(itemInfo);
    });
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      const secondsSinceEpoch = this.deps.resources.get("/clock").time;
      const allowsDelegate =
        this.attackDestroySpec.allowsPrimaryDelegation?.(itemInfo) ?? true;
      if (allowsDelegate) {
        if (isAttacking(this.attackInfo, secondsSinceEpoch)) {
          this.responsibleForPrimary = true;
          return;
        }

        if (this.tryAttack(itemInfo)) {
          this.responsibleForPrimary = true;
          return;
        }
      }

      const handled = this.attackDestroySpec.onPrimaryDown?.(itemInfo);

      if (!handled && allowsDelegate) {
        this.doDummyAttack(itemInfo);
        this.responsibleForPrimary = true;
        return;
      }
    });
  }

  onPrimaryHoldTick(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      if (!this.responsibleForPrimary) {
        this.attackDestroySpec.onPrimaryHoldTick?.(itemInfo);
        return;
      }
    });
  }

  onPrimaryUp(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      if (!this.responsibleForPrimary) {
        this.attackDestroySpec.onPrimaryUp?.(itemInfo);
        return;
      }

      this.responsibleForPrimary = false;
    });
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      if (
        this.attackDestroySpec.allowsSecondaryDelegation?.(itemInfo) ??
        true
      ) {
        const secondsSinceEpoch = this.deps.resources.get("/clock").time;
        if (isAttacking(this.attackInfo, secondsSinceEpoch)) {
          this.responsibleForSecondary = true;
          return;
        }
        if (this.tryAttack(itemInfo)) {
          this.responsibleForSecondary = true;
          return;
        }

        if (!(this.attackDestroySpec.onSecondaryDown?.(itemInfo) ?? false)) {
          this.tryDestroyTick(itemInfo, "secondary");
          const handled = Boolean(this.destroyInfo);
          this.responsibleForSecondary = true;
          if (!handled) {
            this.doDummyAttack(itemInfo);
            return;
          }
          return;
        }
      } else {
        this.attackDestroySpec.onSecondaryDown?.(itemInfo);
        return;
      }
    });
  }

  onSecondaryHoldTick(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      if (!this.responsibleForSecondary) {
        this.attackDestroySpec.onSecondaryHoldTick?.(itemInfo);
        return;
      }

      const secondsSinceEpoch = this.deps.resources.get("/clock").time;
      if (isAttacking(this.attackInfo, secondsSinceEpoch)) {
        return;
      }

      this.tryDestroyTick(itemInfo, "secondary");
    });
  }

  onSecondaryUp(itemInfo: ClickableItemInfo) {
    this.guardInteractionError(() => {
      if (!this.responsibleForSecondary) {
        this.attackDestroySpec.onSecondaryUp?.(itemInfo);
        return;
      }

      this.responsibleForSecondary = false;
      if (this.destroyInfo) {
        this.handleDestroyInfoChangeInteraction(undefined);
      }
    });
  }

  tryAttack(itemInfo: ClickableItemInfo) {
    const { attackableEntities } = this.cursor;

    if (attackableEntities.length > 0) {
      this.onAttackStart(attackableEntities, itemInfo);
      return true;
    }
  }

  doDummyAttack(itemInfo: ClickableItemInfo) {
    this.onAttackStart([], itemInfo);
  }

  tryDestroyTick(
    itemInfo: ClickableItemInfo,
    clickType: "primary" | "secondary"
  ) {
    const activeActionToPass: ActiveAction = {
      action: "destroy",
      click: clickType,
      tool: itemInfo.item,
      toolRef: itemInfo.itemRef,
    };
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    const { hit } = this.cursor;

    if (this.deps.actionThrottler.shouldThrottle("destroy")) {
      return;
    }

    const destroyInfo = this.destroyInfo;

    if (
      hit?.kind === "entity" &&
      hit.entity.placeable_component &&
      hit.distance <= this.changeRadius
    ) {
      if (
        this.applyLegacyItemOutput(
          destroyPlaceable(this.legacyItemInput, activeActionToPass, hit)
        )
      ) {
        // maybe fire "onDestroyStopped" /  "onDestroyStarted"
        return;
      }
    }

    if (hitExistingTerrain(hit) && hit.distance <= this.changeRadius) {
      if (
        this.applyLegacyItemOutput(
          destroyOrShapeTerrain(
            this.deps,
            this.legacyItemInput,
            activeActionToPass,
            hit
          )
        )
      ) {
        // maybe fire "onDestroyStopped" /  "onDestroyStarted"
        return;
      }
    }

    if (hit?.kind === "blueprint" && hit.distance <= this.changeRadius) {
      if (!isBlueprintEmpty(this.deps.resources, hit.blueprintEntityId)) {
        // Don't allow destroying non-empty blueprints.
        // Skip
        return;
      }

      // TODO: add hold time delay
      if (
        destroyInfo?.blueprintId !== hit.blueprintEntityId ||
        destroyInfo?.finished
      ) {
        // Use grass hand destuction time for now.
        const actionTimeMs = blockDestructionTimeMs(
          anItem(BikkieIds.grass),
          undefined
        );

        this.handleDestroyInfoChangeInteraction({
          start: secondsSinceEpoch,
          pos: hit.pos,
          face: 0,
          blueprintId: hit.blueprintEntityId,
          canDestroy: true,
          allowed: true,
          hardnessClass: 0,
          activeAction: { ...activeActionToPass, action: "destroy" },
          finished: false,
          actionTimeMs,
        });
      }

      if (destroyInfo && destroyInfo.blueprintId) {
        const actionDelta = 1000 * (secondsSinceEpoch - destroyInfo.start);
        if (actionDelta > destroyInfo.actionTimeMs) {
          this.handleDestroyInfoChangeInteraction({
            ...destroyInfo,
            finished: true,
          });
        } else {
          this.handleDestroyInfoChangeInteraction({
            ...destroyInfo,
            percentage: actionDelta / destroyInfo.actionTimeMs,
          });
        }
      }
      return;
    }

    this.handleDestroyInfoChangeInteraction(undefined);
  }

  onAttackStart(
    attackedEntities: ReadonlyEntity[],
    itemInfo: ClickableItemInfo
  ) {
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;
    handleAttackInteraction(this.deps, {
      attackedEntities,
      tool: itemInfo.item,
      attackInfo: {
        start: secondsSinceEpoch,
        duration: attackIntervalSeconds(itemInfo.item),
      },
    });
  }

  guardInteractionError<T>(code: () => T): T | undefined {
    try {
      return code();
    } catch (error: any) {
      if (error instanceof AttackDestroyInteractionError) {
        handleInteractionError(this.deps, error.interactionError);
        return;
      } else {
        throw error;
      }
    }
  }

  get changeRadius() {
    return changeRadius(this.deps.resources);
  }

  get cursor() {
    return this.deps.resources.get("/scene/cursor");
  }

  get destroyInfo() {
    return this.deps.resources.get("/scene/local_player").destroyInfo;
  }

  set destroyInfo(newInfo: DestroyInfo | undefined) {
    this.deps.resources.get("/scene/local_player").destroyInfo = newInfo;
  }

  get attackInfo() {
    return this.deps.resources.get("/scene/local_player").attackInfo;
  }

  set attackInfo(newInfo: AttackInfo | undefined) {
    this.deps.resources.get("/scene/local_player").attackInfo = newInfo;
  }

  private applyLegacyItemOutput(output: LegacyInteractOutput) {
    let applied = false;
    if (output.destroyInfoChange !== undefined) {
      this.handleDestroyInfoChangeInteraction(
        output.destroyInfoChange.newValue
      );
      applied = true;
    }
    if (output.gameModal !== undefined) {
      this.deps.resources.set("/game_modal", output.gameModal);
      applied = true;
    }
    if (output.interactionError !== undefined) {
      throw new AttackDestroyInteractionError(output.interactionError);
    }
    return applied;
  }

  /*
   * For interaction with fallback item script helpers
   */

  private handleDestroyInfoChangeInteraction(
    destroyInfo: DestroyInfo | undefined
  ) {
    const localPlayer = this.deps.resources.get("/scene/local_player");
    localPlayer.destroyInfo = destroyInfo;
    const secondsSinceEpoch = this.deps.resources.get("/clock").time;

    if ((!destroyInfo || destroyInfo.finished) && !this.cancelWackTimeout) {
      const delay = destroyInfo?.finished
        ? this.deps.actionThrottler.windowSizeMs + 10
        : 50;

      const startEmoteTime = localPlayer.player.emoteInfo?.emoteStartTime;
      this.cancelWackTimeout = setTimeout(() => {
        if (
          localPlayer.player.isEmoting(secondsSinceEpoch, "destroy") &&
          localPlayer.player.emoteInfo?.emoteStartTime === startEmoteTime
        ) {
          localPlayer.player.eagerCancelEmote(this.deps.events);
        }
        this.cancelWackTimeout = undefined;
      }, delay);
    } else if (destroyInfo) {
      if (!localPlayer.player.isEmoting(secondsSinceEpoch, "destroy")) {
        localPlayer.player.eagerEmote(
          this.deps.events,
          this.deps.resources,
          "destroy"
        );
      }
    }

    if (destroyInfo && !destroyInfo.finished && this.cancelWackTimeout) {
      clearTimeout(this.cancelWackTimeout);
      this.cancelWackTimeout = undefined;
    }

    if (destroyInfo?.finished) {
      switch (destroyInfo.activeAction.action) {
        case "shape":
          shapeTerrain(
            this.deps,
            destroyInfo.pos,
            destroyInfo.activeAction.tool?.shape as ShapeName,
            destroyInfo.activeAction.toolRef
          );
          break;
        case "destroy":
          if (destroyInfo.blueprintId) {
            destroyBlueprint(
              this.deps,
              destroyInfo.blueprintId,
              destroyInfo.pos,
              destroyInfo.activeAction.toolRef
            );
          } else if (destroyInfo.groupId) {
            destroyGroup(
              this.deps,
              destroyInfo.pos,
              destroyInfo.groupId,
              destroyInfo.activeAction.toolRef
            );
          } else if (destroyInfo.placeableId) {
            actuallyDestroyPlaceable(
              this.deps,
              destroyInfo.placeableId,
              destroyInfo.pos,
              destroyInfo.activeAction.toolRef
            );
          } else {
            ok(destroyInfo.terrainId);
            destroyTerrain(
              this.deps,
              destroyInfo.pos,
              destroyInfo.activeAction.toolRef,
              destroyInfo.terrainId
            );
          }
          break;
      }
    }
  }

  get legacyItemInput() {
    const localPlayer = this.deps.resources.get("/scene/local_player");

    return {
      actionAllowed: (
        pos: ReadonlyVec3,
        action: AclAction,
        entityId?: BiomesId
      ) => {
        return this.deps.permissionsManager.getPermissionForAction(
          pos,
          action,
          entityId
        );
      },

      groupOccupancyAt: (pos: ReadonlyVec3) =>
        groupOccupancyAt(this.deps.resources, pos),
      plantExperimentalAt: (pos: ReadonlyVec3) =>
        plantExperimentalAt(this.deps.resources, pos),
      groupHardnessClass: (groupId: BiomesId) =>
        groupHardnessClass(
          this.deps.voxeloo,
          this.deps.resources.get("/ecs/c/group_component", groupId)
        ),
      isTerrainAtPosition: (pos: ReadonlyVec3) =>
        isTerrainAtPosition(this.deps.resources, pos),
      checkActionAllowedIfBlueprintVoxel: (
        pos: ReadonlyVec3,
        action: BuildAction
      ) =>
        checkActionAllowedIfBlueprintVoxel(
          getBlueprintAtPosition(this.deps.table, pos)?.id,
          this.deps.resources,
          pos,
          action
        ),
      groupDestructionTimeMs: (groupId: BiomesId, tool: Item | undefined) =>
        groupDestructionTimeMs(
          this.deps.voxeloo,
          localPlayer.id,
          this.deps.resources.get("/ecs/c/group_component", groupId),
          this.deps.resources.get("/ecs/c/created_by", groupId)?.id,
          tool
        ),
      entityGroupPermitsPlaceableDestruction: (entity: ReadonlyEntity) =>
        entity.in_group
          ? allowPlaceableDestruction(
              entity,
              this.deps.resources.get("/ecs/entity", entity.in_group.id)
            )
          : true,

      playerDestroyInfo: localPlayer.destroyInfo,
      secondsSinceEpoch: this.deps.resources.get("/clock").time,
    } as const;
  }
}

import { EditCharacterColorSelector } from "@/client/components/character/EditCharacterColorSelector";
import { EditCharacterHeadShapePanel } from "@/client/components/character/EditCharacterHeadShapePanel";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ownedItemVersions } from "@/client/components/inventory/helpers";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import type { TooltipFlair } from "@/client/components/inventory/InventoryViewContext";
import { InventoryViewContext } from "@/client/components/inventory/InventoryViewContext";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { AvatarWearables } from "@/client/components/social/AvatarWearables";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ProposedChange } from "@/shared/ecs/change";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { AppearanceComponent, Wearing } from "@/shared/ecs/gen/components";
import { AdminDeleteEvent, AdminIceEvent } from "@/shared/ecs/gen/events";
import type {
  Appearance,
  ItemSlot,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import { WrappedProposedChange } from "@/shared/ecs/zod";
import { countOf } from "@/shared/game/items";
import { isSellable, unitSellPrice } from "@/shared/game/sales";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import type { PropsWithChildren } from "react";
import React, { useCallback, useState } from "react";
import { z } from "zod";

const AdminQuestGiverLeftPaneContent: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const clientContext = useClientContext();
  const { reactResources, events, userId } = clientContext;

  const npcMetadata = reactResources.use("/ecs/c/npc_metadata", entityId);

  const [displayName, setDisplayName] = useState(
    reactResources.get("/ecs/c/label", entityId)?.text ?? ""
  );
  const [defaultDialog, setDefaultDialog] = useState(
    reactResources.get("/ecs/c/default_dialog", entityId)?.text ?? ""
  );
  const [isQuestGiver, setIsQuestGiver] = useState(
    Boolean(reactResources.get("/ecs/c/quest_giver", entityId))
  );

  const hasWearing = !!reactResources.get("/ecs/c/wearing", entityId);
  const hasAppearance = !!reactResources.get(
    "/ecs/c/appearance_component",
    entityId
  );

  const [saving, setSaving] = useState(false);
  const [needsSave, setNeedsSave] = useState(false);
  const [error, setError] = useError();

  const { dragItem, setDragItem } = useInventoryDraggerContext();

  const previewAppearance =
    reactResources.use("/ecs/c/appearance_component", entityId)?.appearance ??
    AppearanceComponent.create().appearance;

  const applyEcsChanges = useCallback(async (...changes: ProposedChange[]) => {
    try {
      setSaving(true);
      await zjsonPost(
        "/api/admin/apply_ecs_changes",
        changes.map((e) => new WrappedProposedChange(e)),
        z.void()
      );
    } catch (error: any) {
      setError(error);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleWearableSlotClick = useCallback(
    (
      entityId: BiomesId,
      slotReference: OwnedItemReference,
      slot: ItemSlot,
      _ev: React.MouseEvent
    ) => {
      const nowWearing = reactResources.get("/ecs/c/wearing", entityId);
      const newWearing = nowWearing
        ? Wearing.clone(nowWearing)
        : Wearing.create();

      if (!dragItem) {
        if (slot && slotReference.kind === "wearable") {
          setDragItem({
            kind: "ephemeral",
            item: slot,
            slotDropCallback: () => {
              setDragItem(null);
              newWearing.items.delete(slotReference.key);
              void applyEcsChanges({
                kind: "update",
                entity: {
                  id: entityId,
                  wearing: newWearing,
                },
              });
            },
          });
        }
        return;
      }

      if (dragItem.kind !== "inventory_drag" || !dragItem.slot) {
        return;
      }

      setDragItem(null);
      if (slotReference.kind !== "wearable") {
        return;
      }
      if (dragItem.kind !== "inventory_drag") {
        return;
      }

      const equipSlot = findItemEquippableSlot(dragItem.slot?.item, [
        slotReference.key,
      ]);
      if (!equipSlot) {
        return;
      }

      newWearing.items.set(equipSlot, dragItem.slot.item);
      void applyEcsChanges({
        kind: "update",
        entity: {
          id: entityId,
          wearing: newWearing,
        },
      });
    },
    [dragItem, ...ownedItemVersions(reactResources, entityId), applyEcsChanges]
  );

  const setPreviewAppearance = useCallback(
    (appearance: Appearance) => {
      void applyEcsChanges({
        kind: "update",
        entity: {
          id: entityId,
          appearance_component: AppearanceComponent.create({
            appearance,
          }),
        },
      });
    },
    [applyEcsChanges]
  );

  return (
    <PaneLayout extraClassName="left-pane-admin-editor">
      <div className="padded-view">
        <MaybeError error={error} />
        <DialogCheckbox
          label="Is Quest Giver"
          checked={isQuestGiver}
          onCheck={() => {
            setIsQuestGiver(!isQuestGiver);
            setNeedsSave(true);
          }}
        />

        <label>Name</label>
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setNeedsSave(true);
          }}
        />
        <label>Default Dialog</label>
        <textarea
          placeholder="Default Dialog"
          value={defaultDialog}
          onChange={(e) => {
            setDefaultDialog(e.target.value);
            setNeedsSave(true);
          }}
        />

        {hasWearing && (
          <div className="slotter preview">
            <AvatarWearables
              entityId={entityId}
              onSlotClick={handleWearableSlotClick}
            />
          </div>
        )}

        {hasAppearance && (
          <>
            <div className="edit-character">
              <EditCharacterColorSelector
                previewAppearance={previewAppearance}
                setPreviewAppearance={(fn) => {
                  setPreviewAppearance(fn(previewAppearance));
                }}
                setPreviewHair={() => {}}
              />
              <EditCharacterHeadShapePanel
                selectedId={previewAppearance.head_id}
                previewAppearance={previewAppearance}
                onSelect={(newId) => {
                  setPreviewAppearance({
                    ...previewAppearance,
                    ...{ head_id: newId },
                  });
                }}
              />
            </div>
          </>
        )}

        {npcMetadata && (
          <DialogButton
            onClick={() => {
              reactResources.set("/game_modal", {
                kind: "empty",
              });

              if (!npcMetadata) return;

              fireAndForget(
                events.publish(
                  new (npcMetadata.spawn_event_id
                    ? AdminDeleteEvent
                    : AdminIceEvent)({
                    id: userId,
                    entity_id: entityId,
                  })
                )
              );
            }}
          >
            Remove From World
          </DialogButton>
        )}
      </div>
      <PaneBottomDock>
        <DialogButton
          disabled={!needsSave || saving}
          onClick={() => {
            void applyEcsChanges({
              kind: "update",
              entity: {
                id: entityId,
                label: {
                  text: displayName,
                },
                ...(defaultDialog !==
                (reactResources.get("/ecs/c/default_dialog", entityId)?.text ??
                  "")
                  ? {
                      default_dialog: {
                        text: defaultDialog,
                        modified_at: secondsSinceEpoch(),
                        modified_by: userId,
                      },
                    }
                  : undefined),
                ...(isQuestGiver
                  ? {
                      quest_giver: {
                        concurrent_quests: undefined,
                        concurrent_quest_dialog: undefined,
                      },
                      // When we make an entity a quest giver, also make it so it never expires.
                      expires: null,
                    }
                  : { quest_giver: null }),
              },
            }).then(() => {
              setNeedsSave(false);
            });
          }}
          type="primary"
        >
          {saving ? "Saving" : "Save"}
        </DialogButton>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const AdminQuestGiverScreen: React.FunctionComponent<
  PropsWithChildren<{
    entityId: BiomesId;
  }>
> = ({ entityId, children }) => {
  return (
    <InventoryViewContext.Provider
      value={{
        tooltipFlairForItem(item): TooltipFlair[] {
          if (!isSellable(item.item)) {
            return [];
          }

          return [
            {
              kind: "sale",
              unitPrice: countOf(BikkieIds.bling, unitSellPrice(item.item)),
            },
          ];
        },
      }}
    >
      <SplitPaneScreen
        extraClassName="profile"
        leftPaneExtraClassName="biomes-box"
        rightPaneExtraClassName="biomes-box"
      >
        <ScreenTitleBar title={"Edit NPC"} />
        <RawLeftPane>
          <AdminQuestGiverLeftPaneContent entityId={entityId} />
        </RawLeftPane>
        <RawRightPane>
          <SelfInventoryRightPane>{children}</SelfInventoryRightPane>
        </RawRightPane>
      </SplitPaneScreen>
    </InventoryViewContext.Provider>
  );
};

import {
  makeLensMap,
  makeLensMapEntry,
} from "@/client/components/admin/zod_form_synthesis/shared";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  invalidateCachedSingleOOBFetch,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import {
  ownedItemVersions,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import { SelfInventoryRightPane } from "@/client/components/inventory/SelfInventoryScreen";
import { MinigameLeaderboardRightPane } from "@/client/components/minigames/MinigameLeaderboard";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTextInput } from "@/client/components/system/DialogTextInput";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { RawLeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import { PhotoPickerField } from "@/client/components/teams/ViewTeamSlideover";
import { useCachedPostBundle } from "@/client/util/social_manager_hooks";
import { clientModFor } from "@/server/shared/minigames/client_mods";
import { parseMinigameSettings } from "@/server/shared/minigames/type_utils";
import type { MinigameLoadoutSetting } from "@/server/shared/minigames/types";
import { zMinigameLoadoutSetting } from "@/server/shared/minigames/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { EditMinigameMetadataEvent } from "@/shared/ecs/gen/events";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import type { ItemAndCount } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { fireAndForget } from "@/shared/util/async";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import { isEmpty } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

function loadoutLens(
  schema: typeof zMinigameLoadoutSetting,
  value: MinigameLoadoutSetting,
  onChangeRequest: (newValue: MinigameLoadoutSetting) => void
) {
  return (
    <ZfsMinigameLoadout
      schema={schema}
      value={value}
      onChangeRequest={onChangeRequest}
    />
  );
}

function containerToLoadoutSetting(
  container: Array<ItemAndCount | undefined>
): MinigameLoadoutSetting {
  return container.flatMap((e) => {
    if (e) {
      return [[e.item.id, Number(e.count)]];
    }
    return [];
  });
}

const ZfsMinigameLoadout: React.FunctionComponent<{
  schema: typeof zMinigameLoadoutSetting;
  value: MinigameLoadoutSetting;
  onChangeRequest: (newValue: MinigameLoadoutSetting) => void;
}> = ({ value, onChangeRequest }) => {
  const { reactResources, userId } = useClientContext();
  const ownedItems = useOwnedItems(reactResources, userId);
  const container = useMemo(() => {
    const ret: (ItemAndCount | undefined)[] = value.map((e) => {
      return countOf(e[0], BigInt(e[1]));
    });

    ret.push(undefined);
    return ret;
  }, [value]);

  const { dragItem, setDragItem } = useInventoryDraggerContext();
  const handleSlotClick = useCallback(
    (slotIdx: number) => {
      if (!dragItem && container[slotIdx]) {
        const item = container[slotIdx];
        if (item) {
          setDragItem({
            kind: "ephemeral",
            item: item,
            slotDropCallback: () => {
              const change = [...container];
              change[slotIdx] = undefined;
              onChangeRequest(containerToLoadoutSetting(change));
              setDragItem(null);
            },
          });
        }
        return;
      } else if (dragItem) {
        if (dragItem.kind === "inventory_drag") {
          const item = maybeGetSlotByRef(ownedItems, dragItem.slotReference);
          if (item) {
            const change = [...container];
            change[slotIdx] = item;
            onChangeRequest(containerToLoadoutSetting(change));
          }
          setDragItem(null);
        }
      }
    },
    [dragItem, container, ...ownedItemVersions(reactResources, userId)]
  );
  return (
    <div className="inventory-cells">
      {container.map((e, idx) => (
        <NormalSlotWithTooltip
          key={idx}
          entityId={INVALID_BIOMES_ID}
          slot={e}
          slotReference={{
            kind: "item",
            idx: idx,
          }}
          onClick={() => handleSlotClick(idx)}
        />
      ))}
    </div>
  );
};

export const MinigameEditLeftPane: React.FunctionComponent<{
  minigame: ReadonlyEntity;
  placeableId?: BiomesId;
}> = ({ minigame, placeableId }) => {
  const clientContext = useClientContext();
  const { userId, events, clientMods, reactResources } = clientContext;
  const [stagedGameName, setStagedGameName] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryPrice, setEntryPrice] = useState<undefined | number>();
  const [settingsValue, setSettingsValue] = useState<any>({});
  const [error, setError] = useError();

  const clientMod = clientModFor(
    clientMods,
    minigame?.minigame_component?.metadata.kind ?? "simple_race"
  );

  const zSettings = clientMod.settingsType;

  const { pushNavigationStack, popNavigationStack } =
    useExistingMiniPhoneContext<GenericMiniPhonePayload>();

  useEffect(() => {
    setStagedGameName(minigame.label?.text ?? "");
    const settings = parseMinigameSettings(
      minigame.minigame_component?.minigame_settings,
      zSettings
    );
    setSettingsValue(settings);
    setEntryPrice(minigame?.minigame_component?.entry_price);
  }, [minigame]);

  const saveData = useCallback(async () => {
    setSaving(true);
    try {
      await events.publish(
        new EditMinigameMetadataEvent({
          id: userId,
          minigame_id: minigame.id,
          label: stagedGameName,
          minigame_settings: zrpcSerialize(settingsValue),
          entry_price: entryPrice || 0,
        })
      );
      await invalidateCachedSingleOOBFetch(clientContext, minigame.id);
    } catch (error: any) {
      setError(error);
    } finally {
      clientContext.reactResources.set("/game_modal", { kind: "empty" });
      setSaving(false);
    }
  }, [stagedGameName, settingsValue, entryPrice]);

  const heroPhoto = useCachedPostBundle(
    clientContext.socialManager,
    minigame?.minigame_component?.hero_photo_id
  );

  const placeable = relevantBiscuitForEntityId(
    clientContext.resources,
    placeableId
  );

  return (
    <PaneLayout>
      <div className="padded-view-auto-height">
        <MaybeError error={error} />
        <div className="form">
          {placeable && (
            <section>
              <DialogButton
                extraClassNames="flex-row"
                onClick={() => {
                  if (!placeableId) return;
                  reactResources.set("/game_modal", {
                    kind: "minigame_placeable_configure",
                    placeableId: placeableId,
                  });
                }}
              >
                <ItemIcon item={placeable} className="h-2 w-2" /> Edit{" "}
                {placeable.displayName}
              </DialogButton>
            </section>
          )}
          <section>
            <label>{`Game Id ${minigame.id}`}</label>
          </section>
          <section>
            <label>Name</label>
            <DialogTextInput
              placeholder="Game Name"
              value={stagedGameName}
              onChange={(e) => {
                setStagedGameName(e.target.value);
              }}
            />
          </section>
          <section>
            <label>Cost to Play</label>
            <DialogTextInput
              placeholder="0 Bling"
              type="number"
              min="0"
              max="1000"
              value={entryPrice || undefined}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEntryPrice(val || undefined);
              }}
            />
          </section>

          <section>
            <label>Game Photo</label>
            <PhotoPickerField
              allowEdit={true}
              heroPhoto={heroPhoto}
              editPhoto={() => {
                pushNavigationStack({
                  type: "select_photo",
                  restrictToSources: ["photos"],
                  onSelected: (data) => {
                    ok(data.kind === "photo");
                    fireAndForget(
                      events
                        .publish(
                          new EditMinigameMetadataEvent({
                            id: userId,
                            minigame_id: minigame.id,
                            hero_photo_id: data.id,
                          })
                        )
                        .then(async () => {
                          return invalidateCachedSingleOOBFetch(
                            clientContext,
                            minigame.id
                          );
                        })
                    );
                    popNavigationStack();
                  },
                });
              }}
            />
          </section>

          {!isEmpty(zSettings.shape) && (
            <section>
              <ZfsAny
                schemaLenses={makeLensMap(
                  makeLensMapEntry(zMinigameLoadoutSetting, loadoutLens)
                )}
                schema={zSettings}
                value={settingsValue}
                onChangeRequest={(newValue) => {
                  setSettingsValue(newValue);
                }}
              />
            </section>
          )}
        </div>
      </div>

      <PaneBottomDock>
        <div className="dialog-button-group">
          <DialogButton
            type="primary"
            disabled={saving}
            onClick={() => {
              void saveData();
            }}
          >
            {saving ? "Saving..." : "Save"}
          </DialogButton>
        </div>
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const MinigameEdit: React.FunctionComponent<{
  minigameId: BiomesId;
  placeableId?: BiomesId;
}> = ({ minigameId, placeableId }) => {
  const minigame = useLatestAvailableEntity(minigameId);

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title="Manage Game" />
      <RawLeftPane>
        {!minigame ? (
          <>No Minigame Found!</>
        ) : (
          <MinigameEditLeftPane minigame={minigame} placeableId={placeableId} />
        )}
      </RawLeftPane>
      <RightPane>
        {minigame && minigame.minigame_component && (
          <>
            {minigame.minigame_component?.metadata.kind === "simple_race" ? (
              <MinigameLeaderboardRightPane minigameId={minigame.id} />
            ) : minigame.minigame_component?.metadata.kind === "spleef" ? (
              <SelfInventoryRightPane />
            ) : (
              <></>
            )}
          </>
        )}
      </RightPane>
    </SplitPaneScreen>
  );
};

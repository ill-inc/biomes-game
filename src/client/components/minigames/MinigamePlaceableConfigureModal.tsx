import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTextInput } from "@/client/components/system/DialogTextInput";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { defaultMinigameName } from "@/client/game/util/minigames";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import { zMyGamesResponse } from "@/pages/api/minigames/my_games";
import type { PlaceableComponent } from "@/shared/ecs/gen/components";
import type { Entity, EntityWith } from "@/shared/ecs/gen/entities";
import {
  AssociateMinigameElementEvent,
  CreateMinigameThroughAssocationEvent,
} from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { safeParseBiomesId, type BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { maybeFirstSetValue } from "@/shared/util/collections";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { drop, sortBy, take } from "lodash";
import { useMemo, useState } from "react";

function compatibleGamesForElement(
  games: Entity[],
  placeable: PlaceableComponent
): EntityWith<"minigame_component">[] {
  const item = anItem(placeable.item_id);
  return games.filter((e) => {
    const k = e.minigame_component?.metadata.kind;
    return k && item.compatibleMinigames?.has(k);
  }) as EntityWith<"minigame_component">[];
}

export const GameSelector: React.FunctionComponent<{
  selectedId?: BiomesId;
  games: EntityWith<"minigame_component">[];
  onSelectId: (id?: BiomesId) => unknown;
}> = ({ games, selectedId, onSelectId }) => {
  return (
    <select
      name="quality"
      value={selectedId ?? "new"}
      onChange={(e) =>
        onSelectId(
          e.target.value === "new"
            ? undefined
            : (parseInt(e.target.value) as BiomesId)
        )
      }
    >
      <optgroup label="Last Edited">
        {take(games, 1).map((e) => (
          <option key={e.id} value={e.id}>
            {e.label?.text ??
              defaultMinigameName(e.minigame_component.metadata.kind)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Others">
        {drop(games, 1).map((e) => (
          <option key={e.id} value={e.id}>
            {e.label?.text ??
              defaultMinigameName(e.minigame_component.metadata.kind)}
          </option>
        ))}
      </optgroup>
      <optgroup label="New">
        <option value="new">New</option>
      </optgroup>
    </select>
  );
};

export const MinigamePlaceableConfigureModal: React.FunctionComponent<{
  onClose?: () => void;
  placeableId: BiomesId;
}> = ({ onClose, placeableId }) => {
  const { authManager, resources, reactResources, events, userId } =
    useClientContext();
  const [error, setError] = useError();
  const [selectedId, setSelectedId] = useState<BiomesId | undefined>();
  const [newName, setNewName] = useState("");
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const { data, loading } = useAsyncInitialDataFetch(async () => {
    const games = await zjsonPost<{}, typeof zMyGamesResponse>(
      "/api/minigames/my_games",
      {},
      zMyGamesResponse
    );
    const ret = sortBy(
      games.games.map((e) => e.entity),
      (e) => -(e?.minigame_component?.game_modified_at ?? 0)
    );
    setSelectedId(ret[0].id);
    return ret;
  }, setError);

  const [placeableElement, placeableMinigameElement] = reactResources.useAll(
    ["/ecs/c/placeable_component", placeableId],
    ["/ecs/c/minigame_element", placeableId]
  );

  const compatibleGames = useMemo(() => {
    if (placeableElement) {
      return compatibleGamesForElement(data ?? [], placeableElement);
    }

    return [];
  }, [data, placeableElement]);

  if (!placeableElement) {
    onClose?.();
    return <></>;
  }

  const item = relevantBiscuitForEntityId(resources, placeableId);
  const minigameType = maybeFirstSetValue(item?.compatibleMinigames);

  return (
    <DialogBox>
      <DialogBoxTitle>Add to Game</DialogBoxTitle>
      <DialogBoxContents>
        <MaybeError error={error} />
        {loading ? (
          <select>
            <option value="Loading games..." disabled selected>
              Loading
            </option>
          </select>
        ) : (
          <>
            <GameSelector
              games={compatibleGames}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
            {selectedId === undefined && (
              <>
                <DialogTextInput
                  placeholder="New minigame name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                  }}
                />
              </>
            )}
            {isAdmin && (
              <input
                type={"number"}
                value={selectedId ?? ""}
                placeholder="Manual ID"
                onChange={(e) => {
                  const bid = safeParseBiomesId(e.target.value);
                  if (bid) {
                    setSelectedId(bid);
                  }
                }}
              />
            )}
          </>
        )}
        <DialogButton
          disabled={!minigameType || (selectedId === undefined && !newName)}
          type="primary"
          onClick={async () => {
            if (selectedId === undefined) {
              await events.publish(
                new CreateMinigameThroughAssocationEvent({
                  id: userId,
                  name: newName,
                  minigameType: minigameType,
                  minigame_element_id: placeableId,
                  old_minigame_id: placeableMinigameElement?.minigame_id,
                })
              );
            } else {
              await events.publish(
                new AssociateMinigameElementEvent({
                  id: userId,
                  minigame_element_id: placeableId,
                  minigame_id: selectedId,
                  old_minigame_id: placeableMinigameElement?.minigame_id,
                })
              );
            }
            onClose?.();
          }}
        >
          Save
        </DialogButton>
        <DialogButton
          onClick={() => {
            onClose?.();
          }}
        >
          Cancel
        </DialogButton>
      </DialogBoxContents>
    </DialogBox>
  );
};

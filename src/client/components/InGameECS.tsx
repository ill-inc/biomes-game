import type { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { NumberRangeEditor } from "@/client/components/admin/bikkie/attributes/NumberRangeEditor";
import { PredicateSetEditor } from "@/client/components/admin/bikkie/attributes/PredicateSetEditor";
import { VoiceDropDown } from "@/client/components/admin/bikkie/attributes/VoiceDropDown";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import {
  makeLensMap,
  makeLensMapEntry,
} from "@/client/components/admin/zod_form_synthesis/shared";
import { EditCharacterColorSelector } from "@/client/components/character/EditCharacterColorSelector";
import { EditCharacterHeadShapePanel } from "@/client/components/character/EditCharacterHeadShapePanel";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { captureProfilePicScreenshot } from "@/client/components/inventory/SelfInventoryScreen";
import { AvatarWearables } from "@/client/components/social/AvatarWearables";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { UserSelection } from "@/client/components/social/UserSelection";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { DialogTextInput } from "@/client/components/system/DialogTextInput";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import { warpToPosition } from "@/client/game/util/warping";
import { invalidateLandmarks } from "@/client/util/map_hooks";
import { switchSyncTarget } from "@/client/util/observer";
import type { UpdateEntityProfilePictureRequest } from "@/pages/api/upload/entity_profile_pic";
import {
  dynamicBaseURL,
  rewrittenWorldPermalink,
} from "@/server/web/util/urls";
import { safeGetTerrainName } from "@/shared/asset_defs/terrain";
import { getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds, WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { bikkie, type SchemaPath } from "@/shared/bikkie/schema/biomes";
import {
  isNumberRangeType,
  zProtectionSize,
} from "@/shared/bikkie/schema/types";
import { DEFAULT_ROBOT_EXPIRATION_S } from "@/shared/constants";
import type { ProposedChange } from "@/shared/ecs/change";
import {
  secondsSinceEpoch,
  secondsSinceEpochToDate,
} from "@/shared/ecs/config";
import type {
  Irradiance,
  Landmark,
  ReadonlyAclComponent,
  ReadonlyItemBuyer,
  ReadonlyLandmark,
  RobotComponent,
} from "@/shared/ecs/gen/components";
import {
  AclComponent,
  AppearanceComponent,
  CreatedBy,
  ItemBuyer,
  Wearing,
} from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  AdminDeleteEvent,
  AdminIceEvent,
  PokePlantEvent,
} from "@/shared/ecs/gen/events";
import type {
  Appearance,
  Item,
  OwnedItemReference,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { zI32, zVec4i } from "@/shared/ecs/gen/types";
import { WrappedProposedChange } from "@/shared/ecs/zod";
import { getAclPreset } from "@/shared/game/acls_base";
import { getSlotByRef } from "@/shared/game/inventory";
import type { ItemPayload } from "@/shared/game/item";
import { anItem, updateItem } from "@/shared/game/item";
import { getItemTypeId } from "@/shared/game/items";
import { blockPos, shardEncode, voxelToShardPos } from "@/shared/game/shard";
import type { TerrainHit } from "@/shared/game/spatial";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { fireAndForget } from "@/shared/util/async";
import { DefaultMap } from "@/shared/util/collections";
import { jsonPost, zjsonPost } from "@/shared/util/fetch_helpers";
import { capitalize, compact, sample, sortBy } from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

const WearableTextEditor: React.FunctionComponent<{
  type?: string;
  item?: Item;
  disabled: boolean;
  isAdder?: boolean;
  onChange: (newVal: Item | undefined) => unknown;
}> = ({ type, item, onChange, disabled, isAdder }) => {
  const schema = `/items/wearables${
    type ? `/${type}` : undefined
  }` as SchemaPath;
  const allItems = sortBy(useMatchingBiscuits(schema), (e) => e.displayName);
  const dyes = useMatchingBiscuits("/dyes");
  disabled = disabled || allItems.length === 0 || dyes.length === 0;

  const [itemId, setItemId] = useState<BiomesId>(
    item ? item.id : INVALID_BIOMES_ID
  );
  const [dye, setDye] = useState<BiomesId | undefined>(
    item ? item.dyedWith : undefined
  );

  // Update on changes to item or dye
  useEffect(() => {
    if (
      disabled ||
      (itemId === INVALID_BIOMES_ID && item === undefined) ||
      (itemId === item?.id && dye === item?.dyedWith)
    ) {
      return;
    }

    if (itemId === INVALID_BIOMES_ID) {
      onChange(undefined);
      return;
    }
    const newItem = anItem(itemId);
    if (!newItem) return;
    const base: ItemPayload = {
      ...newItem.payload,
      [attribs.dyedWith.id]: dye,
    };

    onChange(anItem(itemId, base));
  }, [itemId, dye]);

  return (
    <div>
      <div>{capitalize(type)}</div>
      <BiscuitDropDown
        biscuits={allItems}
        selected={itemId}
        nullItem={isAdder ? "None" : "Remove"}
        disabled={disabled}
        useDisplayName
        onSelect={(newItemId) => {
          setItemId(newItemId ?? INVALID_BIOMES_ID);
        }}
      />
      <BiscuitDropDown
        disabled={disabled || !item?.isWearable || item.wearAsHair}
        nullItem="No Dye"
        biscuits={dyes}
        selected={item && item.dyedWith ? item.dyedWith : INVALID_BIOMES_ID}
        useDisplayName
        onSelect={(newDye) => {
          setDye(newDye);
        }}
      />
    </div>
  );
};

const ItemBuyerComponentEditor: React.FunctionComponent<{
  value: ReadonlyItemBuyer | undefined;
  onChange: (itemBuyer: ItemBuyer | undefined) => unknown;
}> = ({ value, onChange }) => {
  return (
    <>
      <DialogCheckbox
        label="Is Item Buyer"
        checked={Boolean(value)}
        onCheck={(checked) => {
          onChange(checked ? ItemBuyer.create() : undefined);
        }}
      />
      {value && (
        <>
          <label>Buyer Description</label>
          <DialogTextInput
            placeholder="Item Buyer"
            value={value.buy_description}
            onChange={(e) => {
              onChange({
                ...value,
                buy_description: e.target.value,
              } as ItemBuyer);
            }}
          />

          <label>Buying Predicates</label>
          <PredicateSetEditor
            value={new Set(value.attribute_ids)}
            onChange={(v) => {
              onChange({
                ...value,
                attribute_ids: [...v],
              });
            }}
            placeholder={"None"}
          />
        </>
      )}
    </>
  );
};

const EntityAclComponentEditor: React.FunctionComponent<{
  value: ReadonlyAclComponent | undefined;
  onChange: (aclComponent: AclComponent | undefined) => unknown;
}> = ({ value, onChange }) => {
  return (
    <DialogCheckbox
      label="Entity Protects Itself"
      checked={!!value && !value.acl.everyone.has("destroy")}
      onCheck={(checked) => {
        if (checked) {
          const aclComponent = AclComponent.clone(value);
          aclComponent.acl.everyone.delete("destroy");
          aclComponent.acl.roles.set(
            "groundskeeper",
            new Set(getAclPreset("Admin"))
          );
          onChange(aclComponent);
        } else {
          // When ACL Component is missing, we use default group behavior.
          onChange(undefined);
        }
      }}
    />
  );
};

const CreatedByEditor: React.FunctionComponent<{
  value: CreatedBy | undefined;
  onChange: (createdBy: CreatedBy | undefined) => unknown;
}> = ({ value, onChange }) => {
  return (
    <UserSelection
      value={value?.id}
      onSelect={(userId) => {
        if (!userId) {
          onChange(undefined);
          return;
        }
        const createdBy = CreatedBy.clone(value);
        createdBy.id = userId;
        onChange(createdBy);
      }}
    />
  );
};

const FarmingPlantInspection: React.FunctionComponent<{
  id: BiomesId;
}> = ({ id }) => {
  const { reactResources, events } = useClientContext();
  const plant = reactResources.use("/ecs/c/farming_plant_component", id);

  const forceTick = useCallback(() => {
    void events.publish(
      new PokePlantEvent({
        id,
      })
    );
  }, [id, events]);

  if (!plant) {
    return <></>;
  }
  return (
    <section className="mt-1">
      <label>Farming Plant</label>
      <button className="button dialog-button" onClick={forceTick}>
        Force tick
      </button>
      <label>
        Entity: <EntityLink id={id} />
      </label>
      <label>Seed: {anItem(plant.seed)?.displayName}</label>
      <label>Status: {plant.status}</label>
      {plant.variant !== undefined && <label>Variant: {plant.variant}</label>}
      {plant.planter && (
        <label>
          Planter: <EntityLink id={plant.planter} />
        </label>
      )}
      {plant.last_tick && (
        <label>
          Last Tick: {secondsSinceEpochToDate(plant.last_tick).toLocaleString()}
        </label>
      )}
      {plant.plant_time && (
        <label>
          Planted: {secondsSinceEpochToDate(plant.plant_time).toLocaleString()}
        </label>
      )}
      <label>Stage: {plant.stage}</label>
      <label>Stage Progress: {plant.stage_progress * 100}%</label>
      <label>Water Level: {plant.water_level * 100}%</label>
      <label>Wilt: {plant.wilt * 100}%</label>
      <label>
        Player Actions:{" "}
        <ul className="list-disc pl-2">
          {plant.player_actions.map((action, i) => (
            <li key={i}>{action.kind}</li>
          ))}
        </ul>
      </label>
      <label>
        Buffs:{" "}
        <ul className="list-disc pl-2">
          {plant.buffs.map((id) => (
            <li key={id}>{anItem(id)?.displayName ?? id}</li>
          ))}
        </ul>
      </label>
      {plant.water_at && (
        <label>
          Water At: {secondsSinceEpochToDate(plant.water_at).toLocaleString()}
        </label>
      )}
      {plant.fully_grown_at && (
        <label>
          Fully Grown At:{" "}
          {secondsSinceEpochToDate(plant.fully_grown_at).toLocaleString()}
        </label>
      )}
    </section>
  );
};

const LandmarkComponentEditor: React.FunctionComponent<{
  landmark: ReadonlyLandmark | undefined;
  onChange: (landmark: Landmark | undefined) => unknown;
}> = ({ landmark, onChange }) => {
  return (
    <>
      <DialogCheckbox
        label="Is Landmark"
        checked={Boolean(landmark)}
        onCheck={() => {
          onChange(
            landmark
              ? undefined
              : {
                  importance: 0,
                  override_name: undefined,
                }
          );
        }}
      />
      {landmark && (
        <>
          <input
            type="text"
            placeholder="Override name"
            value={landmark.override_name ?? ""}
            onChange={(e) => {
              onChange({
                ...landmark,
                override_name: e.target.value,
              });
            }}
          />
          <input
            type="number"
            placeholder="Importance"
            value={landmark.importance ?? ""}
            onChange={(e) => {
              onChange({
                ...landmark,
                importance: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              });
            }}
          />
        </>
      )}
    </>
  );
};

const EntityLink: React.FunctionComponent<{
  id: BiomesId;
  title?: string;
}> = ({ id, title }) => {
  return (
    <a
      href={dynamicBaseURL(`/admin/ecs/${id}`)}
      target="_blank"
      rel="noreferrer"
    >
      {title ?? id}
    </a>
  );
};

const InGameTerrainECSEditor: React.FunctionComponent<{
  terrainHit: TerrainHit;
}> = ({ terrainHit: hit }) => {
  const { reactResources } = useClientContext();

  const shardPos = voxelToShardPos(...hit.pos);
  const shardId = shardEncode(...shardPos);
  const pos = blockPos(...hit.pos);

  const shardEntity = reactResources.use("/ecs/terrain", shardId);
  const placerId = reactResources.use("/terrain/placer", shardId)?.get(...pos);
  const terrainId = reactResources.use("/terrain/volume", shardId)?.get(...pos);
  const occupancyId = reactResources
    .use("/terrain/occupancy", shardId)
    ?.get(...pos);
  const farmingId = reactResources
    .use("/terrain/farming", shardId)
    ?.get(...pos);
  const growthLevel = reactResources
    .use("/terrain/growth", shardId)
    ?.get(...pos);
  const moistureLevel = reactResources
    .use("/terrain/moisture", shardId)
    ?.get(...pos);
  const muckLevel = reactResources.use("/terrain/muck", shardId)?.get(...pos);
  const irradianceValue = reactResources
    .use("/lighting/irradiance", shardId)
    ?.get(...pos)
    .toString(16);
  const occlusionLevel = reactResources
    .use("/lighting/sky_occlusion", shardId)
    ?.get(...pos);
  const restoration = reactResources
    .use("/terrain/restorations", shardId)
    .getRestoreDataAt(pos);

  const vec3ToString = (v: ReadonlyVec3) => `${v[0]}, ${v[1]}, ${v[2]}`;

  if (!shardEntity) {
    return (
      <div>
        Could not find terrain entity at world position{" "}
        {`(${vec3ToString(hit.pos)})`}!
      </div>
    );
  }

  return (
    <div className="ecs-editor max-h-full">
      <div className="content">
        <div className="edit-character form">
          <section>
            <label className="flex gap-1">
              Terrain entity id:
              <EntityLink id={shardEntity.id} />
            </label>
          </section>

          <section>
            <label>World position: {vec3ToString(hit.pos)}</label>
            <label>Shard position: {vec3ToString(shardPos)}</label>
            <label>Block position (within shard): {vec3ToString(pos)}</label>
          </section>
          <section>
            <label>
              Terrain Id: {terrainId} ({safeGetTerrainName(terrainId ?? 0)})
            </label>
            <label>
              Placer Id:{" "}
              {placerId ? <EntityLink id={placerId as BiomesId} /> : "None"}
            </label>
            <label>
              Occupancy Id:{" "}
              {occupancyId ? (
                <EntityLink id={occupancyId as BiomesId} />
              ) : (
                "None"
              )}
            </label>
            <label>
              Farming Id:{" "}
              {farmingId ? <EntityLink id={farmingId as BiomesId} /> : "None"}
            </label>
            <label>Growth Level: {growthLevel ?? "None"}</label>
            <label>Moisture Level: {moistureLevel ?? "None"}</label>
            <label>Muck Level: {muckLevel ?? "None"}</label>
            <label>Occlusion Level: {occlusionLevel ?? "None"}</label>
            <label>Irradiance Value: {irradianceValue ?? "None"}</label>
            <label>
              Restoration:{" "}
              {restoration
                ? restoration.restore_time === Infinity
                  ? "Infinity"
                  : `${restoration.restore_time - secondsSinceEpoch()}s`
                : "No restoration"}
            </label>
            {farmingId && <FarmingPlantInspection id={farmingId as BiomesId} />}
          </section>
        </div>
      </div>
    </div>
  );
};

const InGameECSEditor: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const clientContext = useClientContext();
  const { resources, reactResources, events, io, userId } = clientContext;
  const entity = reactResources.use("/ecs/entity", entityId)!;
  const inventory = entity.inventory;
  const wearing = entity.wearing;

  const [displayName, setDisplayName] = useState(entity.label?.text ?? "");
  const [defaultDialog, setDefaultDialog] = useState(
    entity.default_dialog?.text ?? ""
  );
  const [entityDescription, setEntityDescription] = useState(
    entity.entity_description?.text ?? ""
  );
  const [isQuestGiver, setIsQuestGiver] = useState(Boolean(entity.quest_giver));
  const [maxConcurrentQuests, setMaxConcurrentQuests] = useState(
    entity.quest_giver?.concurrent_quests ?? 0
  );
  const [concurrentQuestDialog, setConcurrentQuestDialog] = useState(
    entity.quest_giver?.concurrent_quest_dialog ?? ""
  );
  const [landmark, setLandmark] = useState(entity.landmark);
  const [hasIrradiance, setHasIrradiance] = useState<boolean>(
    entity.irradiance !== undefined
  );
  const [irradiance, setIrradiance] = useState<Irradiance>({
    intensity: entity.irradiance?.intensity ?? 15,
    color: (entity.irradiance?.color ?? [255, 255, 255]) as Vec3f,
  });
  const [hasVoice, setHasVoice] = useState<boolean>(entity.voice !== undefined);
  const [voice, setVoice] = useState(entity.voice?.voice ?? "");

  const hasAppearance = Boolean(entity.appearance_component);

  const [projectsProtection, setProjectsProtection] = useState(
    entity.projects_protection
  );
  const [unmuck, setUnmuck] = useState(entity.unmuck);

  const [createdBy, setCreatedBy] = useState(entity.created_by);

  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [needsSave, setNeedsSave] = useState(false);

  const triggerTime = entity.robot_component?.trigger_at;
  const [robotCharge, setRobotCharge] = useState(
    triggerTime ? triggerTime - secondsSinceEpoch() : undefined
  );
  const [error, setError] = useError();

  const previewAppearance =
    entity.appearance_component?.appearance ??
    AppearanceComponent.create().appearance;

  const allWearables = useMatchingBiscuits("/items/wearables");
  const allDyes = useMatchingBiscuits("/dyes");

  const wearablesByType = useMemo(() => {
    const newMap = new DefaultMap<BiomesId, Item[]>(() => []);
    for (const wearable of allWearables) {
      if (WEARABLE_SLOTS.includes(wearable.id)) {
        // Skip type items.
        continue;
      }
      const wearableType = getItemTypeId(anItem(wearable.id));
      newMap.get(wearableType).push(anItem(wearable.id));
    }
    return newMap;
  }, [allWearables]);

  const robotComponent = (): RobotComponent | null => {
    if (!entity.robot_component) {
      return null;
    }

    let newTriggerTime = undefined;
    const previouslyWasAdminRobot =
      entity.robot_component.trigger_at === undefined;
    if (createdBy && previouslyWasAdminRobot) {
      // Not admin robot anymore
      newTriggerTime = secondsSinceEpoch() + DEFAULT_ROBOT_EXPIRATION_S;
      setRobotCharge(DEFAULT_ROBOT_EXPIRATION_S);
    } else if (createdBy) {
      // Not admin robot
      newTriggerTime = secondsSinceEpoch() + (robotCharge ?? 0);
    }

    return {
      ...entity.robot_component,
      trigger_at: newTriggerTime,
    };
  };

  const applyEcsChanges = useCallback(async (...changes: ProposedChange[]) => {
    try {
      setSaving(true);
      await zjsonPost(
        "/api/admin/apply_ecs_changes",
        changes.map((e) => new WrappedProposedChange(e)),
        z.void()
      );
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
      }, 1000);
      invalidateLandmarks(clientContext);
    } catch (error: any) {
      setError(error);
    } finally {
      setSaving(false);
    }
  }, []);

  const equipNewWearables = useCallback(
    (items: Item[]) => {
      const newWearing = Wearing.create();
      for (const item of items) {
        const equipSlot = findItemEquippableSlot(item);
        if (equipSlot) {
          newWearing.items.set(equipSlot, item);
        }
      }

      void applyEcsChanges({
        kind: "update",
        entity: {
          id: entity.id,
          wearing: newWearing,
        },
      });
    },
    [wearing, inventory, applyEcsChanges]
  );

  const shuffleWearables = useCallback(() => {
    if (!wearablesByType.size) {
      return;
    }
    const items = WEARABLE_SLOTS.map(
      (typeId) => sample(wearablesByType.get(typeId))!
    );
    equipNewWearables(items);
  }, [wearablesByType, equipNewWearables]);

  const shuffleWearableDyes = useCallback(() => {
    if (!allDyes.length) {
      return;
    }

    const newItems = WEARABLE_SLOTS.map((key) => {
      const ref: OwnedItemReference = {
        kind: "wearable",
        key,
      };

      const newDye = sample(allDyes)?.id;
      const slot = getSlotByRef({ inventory, wearing }, ref);

      if (slot?.item === undefined || newDye === undefined) {
        return;
      }

      return updateItem(slot?.item, { [attribs.dyedWith.id]: newDye });
    });

    equipNewWearables(compact(newItems));
  }, [wearing, inventory, allDyes, equipNewWearables]);

  const changeWearable = useCallback(
    (key: BiomesId | undefined, item: Item | undefined) => {
      const equipSlot = findItemEquippableSlot(item);
      const nowWearing = reactResources.get("/ecs/c/wearing", entity.id);
      const newWearing = nowWearing
        ? Wearing.clone(nowWearing)
        : Wearing.create();

      if (key) {
        newWearing.items.delete(key);
      }
      if (equipSlot && item) {
        newWearing.items.set(equipSlot, item);
      }
      void applyEcsChanges({
        kind: "update",
        entity: {
          id: entity.id,
          wearing: newWearing,
        },
      });
    },
    [entity.wearing, entity.inventory, applyEcsChanges]
  );

  const updateProfilePicture = useCallback(
    async (screenshot: string, hash: string) => {
      setUploadingProfilePic(true);
      try {
        await jsonPost<void, UpdateEntityProfilePictureRequest>(
          "/api/upload/entity_profile_pic",
          {
            entityId: entity.id,
            photoDataURI: screenshot,
            hash,
          }
        );
      } catch (error: any) {
        setError(error);
      } finally {
        setUploadingProfilePic(false);
      }
    },
    [entity.id]
  );

  const maybeUploadProfilePic = useCallback(
    async (mesh: LoadedPlayerMesh, renderer: ThreeObjectPreview) => {
      // Timeout because otherwise we are in a T pose
      setTimeout(() => {
        const ecsHash = reactResources.get(
          "/ecs/c/profile_pic",
          entity.id
        )?.hash;
        if (ecsHash !== mesh.hash) {
          const screenshot = captureProfilePicScreenshot(renderer);
          if (!screenshot) {
            return;
          }
          void updateProfilePicture(screenshot, mesh.hash);
        }
      }, 100);
    },
    []
  );

  const setPreviewAppearance = useCallback(
    (appearance: Appearance) => {
      void applyEcsChanges({
        kind: "update",
        entity: {
          id: entity.id,
          appearance_component: AppearanceComponent.create({
            appearance,
          }),
        },
      });
    },
    [applyEcsChanges]
  );

  const shuffleHeadShape = () => {
    const heapShapes = getBiscuits(bikkie.schema.head).map(({ id }) => id);
    const newHeapShape = sample(heapShapes)!;
    setPreviewAppearance({
      ...previewAppearance,
      ...{ head_id: newHeapShape },
    });
  };

  const setPreviewHair = useCallback(
    (item: Item | undefined) => {
      changeWearable(BikkieIds.hair, item);
    },
    [applyEcsChanges]
  );

  const url = entity.position
    ? rewrittenWorldPermalink(entity.position.v as Vec3)
    : undefined;

  const relevantBiscuit = relevantBiscuitForEntityId(resources, entity.id);
  const previewHair = getSlotByRef(
    { inventory, wearing },
    {
      kind: "wearable",
      key: BikkieIds.hair,
    }
  );

  return (
    <div className="ecs-editor flex flex-col justify-stretch overflow-hidden">
      <div className="content overflow-y-scroll">
        <div className="edit-character form">
          <MaybeError error={error} />

          <section>
            <label className="flex gap-1">
              <DialogButton
                onClick={() => {
                  void switchSyncTarget(io, {
                    kind: "entity",
                    entityId: entity.id,
                  });
                }}
              >
                Observer Mode
              </DialogButton>
              <EntityLink id={entity.id} title="ECS" />
              {url && (
                <>
                  ·
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!entity.position) return;
                      void warpToPosition(
                        clientContext,
                        entity.position.v as Vec3
                      );
                    }}
                  >
                    Position URL
                  </a>
                  ·
                  {relevantBiscuit && (
                    <a
                      href={`/admin/bikkie/${relevantBiscuit.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Relevant Biscuit
                    </a>
                  )}
                </>
              )}
            </label>
          </section>

          <section>
            <DialogCheckbox
              label="Is Quest Giver"
              checked={isQuestGiver}
              onCheck={() => {
                setIsQuestGiver(!isQuestGiver);
                setNeedsSave(true);
              }}
            />
            {isQuestGiver && (
              <>
                <label>Max Concurrent Quests</label>
                <input
                  type="number"
                  placeholder="No Limit"
                  value={maxConcurrentQuests}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setMaxConcurrentQuests(value);
                    setNeedsSave(true);
                  }}
                />
              </>
            )}
            {isQuestGiver && (
              <>
                <label>Concurrent Quest Dialog</label>
                <textarea
                  placeholder="Concurrent Quest Dialog"
                  value={concurrentQuestDialog}
                  onChange={(e) => {
                    setConcurrentQuestDialog(e.target.value);
                    setNeedsSave(true);
                  }}
                />
              </>
            )}
          </section>

          <section>
            <LandmarkComponentEditor
              landmark={landmark}
              onChange={(e) => {
                setLandmark(e);
                setNeedsSave(true);
              }}
            />
          </section>

          <section>
            <EntityProfilePic entityId={entity.id} />
          </section>

          <section>
            <label>{uploadingProfilePic ? "[uploading...]" : ""} Name</label>

            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setNeedsSave(true);
              }}
            />
          </section>

          <section>
            <label>Default Dialog</label>
            <textarea
              placeholder="Default Dialog"
              value={defaultDialog}
              onChange={(e) => {
                setDefaultDialog(e.target.value);
                setNeedsSave(true);
              }}
            />
          </section>

          <section>
            <label>Entity Description</label>
            <textarea
              placeholder="Entity Description"
              value={entityDescription}
              onChange={(e) => {
                setEntityDescription(e.target.value);
                setNeedsSave(true);
              }}
            />
          </section>

          <section>
            <>
              <DialogCheckbox
                label="Has Voice"
                checked={Boolean(hasVoice)}
                onCheck={(checked) => {
                  setHasVoice(checked);
                  setNeedsSave(true);
                }}
              />
              {hasVoice && (
                <>
                  <br />
                  <VoiceDropDown
                    voiceId={voice}
                    onChange={(newVoice) => {
                      setVoice(newVoice);
                      setNeedsSave(true);
                    }}
                  />
                  <div className="mt-1 text-right text-xs">
                    <a
                      href="https://beta.elevenlabs.io/voice-library"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voice Library
                    </a>
                  </div>
                </>
              )}
            </>
          </section>

          {hasAppearance && (
            <>
              <div className="slotter preview">
                <AvatarWearables
                  entityId={entity.id}
                  onMeshChange={maybeUploadProfilePic}
                />
              </div>

              <section>
                <label className="flex">
                  <div className="flex-grow">Edit wearables</div>
                  <DialogButton
                    size="small"
                    extraClassNames="btn-inline w-max shrink-0 aspect-auto"
                    onClick={shuffleWearables}
                    disabled={!wearablesByType.size || saving}
                  >
                    🎲 Shuffle
                  </DialogButton>
                </label>
                <label className="flex">
                  <div className="flex-grow">Edit dyes</div>
                  <DialogButton
                    size="small"
                    extraClassNames="btn-inline w-max shrink-0 aspect-auto"
                    onClick={() => shuffleWearableDyes()}
                    disabled={!allDyes.length || saving}
                  >
                    🎲 Shuffle
                  </DialogButton>
                </label>
                <div className="edit-wearables">
                  {WEARABLE_SLOTS.map((key) => {
                    const ref: OwnedItemReference = {
                      kind: "wearable",
                      key,
                    };

                    const slot = getSlotByRef({ inventory, wearing }, ref);

                    return (
                      <WearableTextEditor
                        key={key}
                        type={anItem(key).name}
                        item={slot?.item}
                        disabled={saving}
                        isAdder={slot?.item === undefined}
                        onChange={(item) => {
                          changeWearable(key, item ? item : undefined);
                        }}
                      />
                    );
                  })}
                </div>
              </section>

              <EditCharacterColorSelector
                previewAppearance={previewAppearance}
                setPreviewAppearance={(fn) => {
                  setPreviewAppearance(fn(previewAppearance));
                }}
                setPreviewHair={setPreviewHair}
                previewHair={previewHair?.item}
              />
              <section>
                <label className="flex">
                  <div className="flex-grow">Edit head</div>
                  <DialogButton
                    size="small"
                    extraClassNames="btn-inline w-max shrink-0 aspect-auto"
                    onClick={() => shuffleHeadShape()}
                  >
                    🎲 Shuffle
                  </DialogButton>
                </label>
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
              </section>
            </>
          )}

          <section>
            {projectsProtection && (
              <div className="flex flex-col gap-1">
                <label>Protection & Restoration</label>
                <div className="flex">
                  <div className="flex-grow">Projection:</div>
                  {projectsProtection.protection !== undefined ? "✅" : "None"}
                </div>
                <div className="flex">
                  <div className="flex-grow">Restoration:</div>
                  {projectsProtection.restoration !== undefined
                    ? `${projectsProtection.restoration.restore_delay_s}s`
                    : "None"}
                </div>
                <div className="flex">
                  <div className="flex-grow">Unmuck:</div>
                  {Boolean(unmuck) ? "✅" : "None"}
                </div>

                <label>Field Size</label>
                <ZfsAny
                  schema={zProtectionSize}
                  schemaLenses={makeLensMap(
                    makeLensMapEntry(
                      z.number(),
                      (schema, value, onChangeRequest) => (
                        <NumberRangeEditor
                          schema={schema}
                          value={value}
                          onChangeRequest={onChangeRequest}
                        />
                      ),
                      (schema) => isNumberRangeType(schema)
                    )
                  )}
                  value={[...projectsProtection.size]}
                  onChangeRequest={(newValue) => {
                    setProjectsProtection({
                      ...projectsProtection,
                      size: newValue,
                      snapToGrid: 32,
                    });
                    // Also update unmuck size to match if it's a box.
                    if (unmuck?.volume?.kind === "box") {
                      setUnmuck({
                        volume: { kind: "box", box: newValue },
                        snapToGrid: 32,
                      });
                    }
                    setNeedsSave(true);
                  }}
                ></ZfsAny>
              </div>
            )}
          </section>

          <ItemBuyerComponentEditor
            value={entity.item_buyer}
            onChange={(newItemBuyer) => {
              void applyEcsChanges({
                kind: "update",
                entity: {
                  id: entity.id,
                  item_buyer: newItemBuyer ?? null,
                },
              });
            }}
          />

          {(!!entity.group_component || !!entity.placeable_component) && (
            <EntityAclComponentEditor
              value={entity.acl_component}
              onChange={(newAclComponent) => {
                void applyEcsChanges({
                  kind: "update",
                  entity: {
                    id: entity.id,
                    acl_component: newAclComponent ?? null,
                  },
                });
              }}
            />
          )}

          {entity.position && (
            <section>
              <>
                <DialogCheckbox
                  label="Has Irradiance"
                  checked={Boolean(hasIrradiance)}
                  onCheck={(checked) => {
                    setHasIrradiance(checked);
                    setNeedsSave(true);
                  }}
                />
                {hasIrradiance && (
                  <>
                    <br />
                    <ZfsAny
                      schema={zVec4i}
                      value={[
                        irradiance.color["0"],
                        irradiance.color["1"],
                        irradiance.color["2"],
                        irradiance.intensity,
                      ]}
                      onChangeRequest={(newValue) => {
                        const clampedValue = newValue.map((value) =>
                          Math.max(0, Math.min(value, 255))
                        );
                        setIrradiance({
                          color: [
                            clampedValue[0],
                            clampedValue[1],
                            clampedValue[2],
                          ],
                          intensity: clampedValue[3],
                        });
                        setNeedsSave(true);
                      }}
                    />
                  </>
                )}
              </>
            </section>
          )}

          <section>
            <DialogCheckbox
              label="Created By"
              checked={Boolean(createdBy)}
              onCheck={(checked) => {
                setCreatedBy(checked ? CreatedBy.create({}) : undefined);
                setNeedsSave(true);
              }}
            />

            {entity.robot_component && createdBy && (
              <section>
                <>
                  <label>Charge (in days)</label>
                  <ZfsAny
                    schema={zI32}
                    value={Math.round((robotCharge ?? 0) / (24 * 60 * 60))}
                    onChangeRequest={(newValue) => {
                      // Convert from time in days to time in seconds
                      setRobotCharge(newValue * (24 * 60 * 60));
                      setNeedsSave(true);
                    }}
                  />
                </>
              </section>
            )}

            {createdBy && (
              <>
                <label>User</label>
                <CreatedByEditor
                  value={entity.created_by}
                  onChange={(newCreatedBy) => {
                    setCreatedBy(newCreatedBy);
                    setNeedsSave(true);
                  }}
                />
              </>
            )}
          </section>
        </div>
      </div>
      <div className="bottom">
        {entity.npc_metadata && (
          <DialogButton
            onClick={() => {
              fireAndForget(
                events.publish(
                  new (entity.npc_metadata!.spawn_event_id
                    ? AdminDeleteEvent
                    : AdminIceEvent)({
                    id: userId,
                    entity_id: entity.id,
                  })
                )
              );
            }}
            extraClassNames="mt-1"
          >
            Remove From World
          </DialogButton>
        )}
        <DialogButton
          disabled={!needsSave || saving}
          onClick={() => {
            void applyEcsChanges({
              kind: "update",
              entity: {
                id: entity.id,
                label: {
                  text: displayName,
                },
                ...(defaultDialog !== (entity.default_dialog?.text ?? "")
                  ? {
                      default_dialog: {
                        text: defaultDialog,
                        modified_at: secondsSinceEpoch(),
                        modified_by: userId,
                      },
                    }
                  : undefined),
                entity_description: entityDescription
                  ? {
                      text: entityDescription,
                    }
                  : undefined,
                projects_protection: projectsProtection ?? null,
                unmuck: unmuck ?? null,
                ...(isQuestGiver
                  ? {
                      quest_giver: {
                        concurrent_quests: maxConcurrentQuests,
                        concurrent_quest_dialog: concurrentQuestDialog,
                      },
                      // When we make an entity a quest giver, also make it so it never expires.
                      expires: null,
                    }
                  : { quest_giver: null }),
                landmark: landmark ?? null,
                created_by: createdBy ?? null,
                robot_component: robotComponent(),
                irradiance: hasIrradiance ? irradiance : null,
                locked_in_place: hasIrradiance ? {} : undefined,
                voice: hasVoice ? { voice } : null,
              },
            }).then(() => {
              setNeedsSave(false);
            });
          }}
          type="primary"
          extraClassNames="mt-1"
        >
          {saving ? "Saving" : justSaved ? "Saved!" : "Save"}
        </DialogButton>
      </div>
    </div>
  );
});

export type InGameECSMode = "auto" | "self" | "initial";

export const InGameECS: React.FunctionComponent<{
  initialTarget: ReadonlyEntity | undefined;
  mode: InGameECSMode;
}> = ({ initialTarget, mode }) => {
  const { reactResources, userId } = useClientContext();
  const { hit } = reactResources.use("/scene/cursor");

  const selectedEntity = reactResources.use("/admin/current_entity").entity;

  const cursorEntity = reactResources.use(
    "/ecs/entity",

    mode === "self"
      ? userId
      : selectedEntity
      ? selectedEntity.id
      : hit?.kind === "entity"
      ? hit.entity.id
      : hit?.kind === "terrain"
      ? hit.groupId ?? INVALID_BIOMES_ID
      : hit?.kind === "blueprint"
      ? hit.blueprintEntityId
      : INVALID_BIOMES_ID
  );

  const entity = cursorEntity ?? selectedEntity;

  return (
    <>
      {initialTarget !== undefined && mode === "initial" ? (
        <InGameECSEditor entityId={initialTarget.id} />
      ) : entity ? (
        <InGameECSEditor entityId={entity.id} key={entity.id} />
      ) : hit?.kind === "terrain" ? (
        <InGameTerrainECSEditor terrainHit={hit} />
      ) : (
        <div>No entity highlighted!</div>
      )}
    </>
  );
};

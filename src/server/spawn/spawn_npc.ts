import type { ChangeToApply } from "@/shared/api/transaction";
import { colorEntries } from "@/shared/asset_defs/color_palettes";
import { BikkieRuntime, getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds, WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { NameGenerator } from "@/shared/bikkie/schema/types";
import type {
  ReadonlyAppearanceComponent,
  ReadonlyWearing,
} from "@/shared/ecs/gen/components";
import {
  AppearanceComponent,
  Collideable,
  DefaultDialog,
  Expires,
  Health,
  Label,
  NpcMetadata,
  NpcState,
  Orientation,
  Position,
  QuestGiver,
  RigidBody,
  Size,
  Wearing,
} from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { getItemTypeId } from "@/shared/game/items";
import { playerAABB } from "@/shared/game/players";
import { findItemEquippableSlot } from "@/shared/game/wearables";
import type { BiomesId } from "@/shared/ids";
import { sampleTruncatedGaussianDistribution } from "@/shared/math/gaussian";
import { sizeAABB } from "@/shared/math/linear";
import type { Vec2, Vec3 } from "@/shared/math/types";
import type { NpcType } from "@/shared/npc/bikkie";
import { idToNpcType } from "@/shared/npc/bikkie";
import {
  deserializeNpcCustomState,
  serializeNpcCustomState,
} from "@/shared/npc/serde";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";
import { sample } from "lodash";
import type { Config } from "unique-names-generator";
import { names, uniqueNamesGenerator } from "unique-names-generator";

export type NpcSpawnInfo = {
  id: BiomesId;
  typeId: BiomesId;
  position: Vec3;
  orientation?: Vec2;
  velocity?: Vec3;
  displayName?: string;
  appearance?: ReadonlyAppearanceComponent;
  wearing?: ReadonlyWearing;
  defaultDialog?: string;
  spawnEvent?:
    | undefined
    | {
        id: BiomesId;
        typeId: BiomesId;
        position: Vec3;
      };
};

export function npcEntity(
  npc: NpcSpawnInfo,
  secondsSinceEpoch: number
): ReadonlyEntity {
  const npcType = idToNpcType(npc.typeId);
  const maxHp = npcType.behavior.damageable?.maxHp || 1;
  return {
    id: npc.id,
    position: Position.create({ v: npc.position }),
    rigid_body: RigidBody.create({ velocity: npc.velocity ?? [0, 0, 0] }),
    orientation: Orientation.create({ v: npc.orientation ?? [0, 0] }),
    size: Size.create({ v: getNpcSize(npcType) }),
    npc_metadata: NpcMetadata.create({
      type_id: npc.typeId,
      spawn_position: npc.spawnEvent?.position ?? npc.position,
      spawn_orientation: npc.orientation,
      created_time: secondsSinceEpoch,
      spawn_event_id: npc.spawnEvent?.id,
      spawn_event_type_id: npc.spawnEvent?.typeId,
    }),
    npc_state: NpcState.create({
      data: serializeNpcCustomState(deserializeNpcCustomState(undefined)),
    }),
    health: Health.create({
      hp: maxHp,
      maxHp: maxHp,
    }),
    expires: npcType.ttl
      ? Expires.create({
          trigger_at: secondsSinceEpoch + npcType.ttl + Math.random() * 15,
        })
      : undefined,
    quest_giver: npcType.behavior.questGiver
      ? QuestGiver.create({})
      : undefined,
    label: Label.create({
      text: genNpcName(npc, npcType),
    }),
    appearance_component: genNpcAppearance(npc, npcType),
    wearing: genNpcWearables(npc, npcType),
    default_dialog:
      npc.defaultDialog || npcType.npcDefaultDialog
        ? DefaultDialog.create({
            text: npc.defaultDialog || npcType.npcDefaultDialog,
          })
        : undefined,
    collideable: Collideable.create(),
  };
}

export function makeSpawnChangeToApply(
  secondsSinceEpoch: number,
  ...npcs: NpcSpawnInfo[]
): ChangeToApply {
  return {
    changes: npcs.map((npc) => ({
      kind: "create",
      entity: npcEntity(npc, secondsSinceEpoch),
    })),
  };
}

export function getNpcSize(npcType: NpcType): Vec3 {
  if (npcType.isPlayerLikeAppearance) {
    return sizeAABB(playerAABB([0, 0, 0]));
  }

  let size: Vec3 = npcType.boxSize;

  if (npcType.behavior.sizeVariation) {
    const scaleFactor = getRandomizedScaleFactor(
      npcType.behavior.sizeVariation
    );
    size = [
      size[0] * scaleFactor[0],
      size[1] * scaleFactor[1],
      size[2] * scaleFactor[2],
    ];
  }

  return size;
}

function genNameFromGenerator(id: BiomesId, generator: NameGenerator): string {
  if (generator.kind === "selection") {
    const options = generator.options.split(",").map((name) => name.trim());
    return sample(options) ?? "Biomes NPC";
  }

  ok(generator.kind === "random");
  const nameConfig: Config = {
    dictionaries: [names],
    seed: id,
  };

  return uniqueNamesGenerator(nameConfig);
}

function genNpcName(npc: NpcSpawnInfo, npcType: Item): string {
  const nameGenerator = npcType?.npcNameGenerator;
  if (nameGenerator) {
    return genNameFromGenerator(npc.id, nameGenerator);
  }

  return npc.displayName ?? npcType.displayName;
}

function genRandomAppearance(): AppearanceComponent {
  const skinColors = colorEntries("color_palettes/skin_colors");
  const eyeColors = colorEntries("color_palettes/eye_colors");
  const hairColors = colorEntries("color_palettes/hair_colors");
  const heads = getBiscuits(bikkie.schema.head).map(({ id }) => id);

  return AppearanceComponent.create({
    appearance: {
      eye_color_id: sample(eyeColors)!.id,
      skin_color_id: sample(skinColors)!.id,
      hair_color_id: sample(hairColors)!.id,
      head_id: sample(heads)!,
    },
  });
}

const DEFAULT_APPEARANCE = AppearanceComponent.create({
  appearance: {
    eye_color_id: "eye_color_0",
    skin_color_id: `skin_color_${Math.floor(Math.random() * 12)}`,
    hair_color_id: "hair_color_8",
    head_id: BikkieIds.androgenous,
  },
});

function genNpcAppearance(
  npc: NpcSpawnInfo,
  npcType: Item
): AppearanceComponent | undefined {
  if (!npcType.isPlayerLikeAppearance) {
    return undefined;
  }

  if (npcType.npcAppearanceGenerator?.randomAppearance) {
    return genRandomAppearance();
  }

  return npc.appearance ?? DEFAULT_APPEARANCE;
}

function genRandomWearables(): Wearing {
  const wearing = Wearing.create();
  const allWearables = BikkieRuntime.get().getBiscuits("/items/wearables");
  const wearablesByType = new DefaultMap<BiomesId, Item[]>(() => []);
  for (const wearable of allWearables) {
    if (WEARABLE_SLOTS.includes(wearable.id)) {
      // Skip type items.
      continue;
    }
    const wearableType = getItemTypeId(anItem(wearable.id));
    wearablesByType.get(wearableType).push(anItem(wearable.id));
  }

  const wearables = WEARABLE_SLOTS.map(
    (typeId) => sample(wearablesByType.get(typeId))!
  );
  for (const item of wearables) {
    const equipSlot = findItemEquippableSlot(item);
    if (equipSlot) {
      wearing.items.set(equipSlot, item);
    }
  }

  return wearing;
}

const DEFAULT_WEARABLES = Wearing.create({
  items: new Map([
    [BikkieIds.top, anItem(BikkieIds.tatteredTop)],
    [BikkieIds.bottoms, anItem(BikkieIds.tatteredSkirt)],
  ]),
});

function genNpcWearables(
  npc: NpcSpawnInfo,
  npcType: Item
): ReadonlyWearing | undefined {
  if (!npcType.isPlayerLikeAppearance) {
    return undefined;
  }

  if (npcType.npcAppearanceGenerator?.randomWearables) {
    return genRandomWearables();
  }

  return npc.wearing ?? DEFAULT_WEARABLES;
}

const getRandomizedScaleFactor = ({
  mean,
  lowerBound,
  upperBound,
  variance,
}: {
  mean: number;
  lowerBound: number;
  upperBound: number;
  variance: number;
}): Vec3 => {
  const overallScale = sampleTruncatedGaussianDistribution({
    mean,
    lowerBound,
    upperBound,
    variance,
  });

  // Add some variance in the scale of each axis.
  const individualAxisScaleParams = {
    mean: 1,
    lowerBound: 0.9,
    upperBound: 1.1,
    variance: 0.05,
  };

  const xScale = sampleTruncatedGaussianDistribution(individualAxisScaleParams);
  const yScale = sampleTruncatedGaussianDistribution(individualAxisScaleParams);
  const zScale = sampleTruncatedGaussianDistribution(individualAxisScaleParams);

  return [overallScale * xScale, overallScale * yScale, overallScale * zScale];
};

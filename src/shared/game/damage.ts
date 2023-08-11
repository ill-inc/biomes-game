import { BikkieIds } from "@/shared/bikkie/ids";
import { using } from "@/shared/deletable";
import type { GroupComponent } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { Npc } from "@/shared/ecs/gen/entities";
import { scanGroupTensor } from "@/shared/game/group";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { idToNpcType, npcGlobals } from "@/shared/npc/bikkie";
import type { VoxelooModule } from "@/shared/wasm/types";
import { isBlockGroupEntry } from "@/shared/wasm/types/galois";

const blockHpForHardnessClass = [1, 40, 100, 280, 640, 1120, 1600, 3200];

export type BlockToolAffinity = "hand" | "none" | "preferred";

export function blockToolAffinity(
  block: Item | undefined,
  tool: Item | undefined
): BlockToolAffinity {
  const toolDestroyerClass = tool?.destroyerClass;
  if (!toolDestroyerClass) {
    return "hand";
  }
  const blockPreferredDestroyerClass = block?.preferredDestroyerClass;
  if (!blockPreferredDestroyerClass) {
    return "none";
  }
  return toolDestroyerClass === blockPreferredDestroyerClass &&
    tool.hardnessClass >= block.hardnessClass
    ? "preferred"
    : "none";
}

export function blockDestructionTimeMs(
  block: Item | undefined,
  tool: Item | undefined
): number {
  const hp = blockHp(block);
  const dps = blockToolDps(block, tool);
  if (dps === 0) {
    return Infinity;
  }
  const minDestructionTimeMs = tool?.minDestructionTimeMs ?? 0;
  if (!isFinite(dps)) {
    return minDestructionTimeMs;
  } else if (!isFinite(hp)) {
    return Infinity;
  }
  return Math.max(1000 * (hp / dps), minDestructionTimeMs);
}

function blockHp(block: Item | undefined) {
  const blockHardnessClass = block?.hardnessClass ?? 0;
  const baseHp =
    blockHardnessClass >= 0 &&
    blockHardnessClass < blockHpForHardnessClass.length
      ? blockHpForHardnessClass[blockHardnessClass]
      : Infinity;
  return baseHp;
}

// Returns the DPS that the given tool will deal to the given block.
function blockToolDps(block: Item | undefined, tool: Item | undefined) {
  return baseDps(tool) * affinityDpsMultiplier(block, tool);
}

// Returns the base DPS of a given tool.
export function baseDps(tool: Item | undefined) {
  if (tool?.id === BikkieIds.adminAxe) {
    return Infinity;
  }
  return tool?.dps ?? 40;
}

// Certain combinations of blocks and tools can be more effective, get the
// appropriate multiplier.
function affinityDpsMultiplier(
  block: Item | undefined,
  tool: Item | undefined
): number {
  const affinity = blockToolAffinity(block, tool);
  switch (affinity) {
    case "hand":
      return 0.714;
    case "none":
      return 0.833;
    case "preferred":
      return 1.666;
  }
}

export function blockShapeTimeMs(
  block: Item | undefined,
  tool: Item | undefined
) {
  if (!["shape", "shaper"].includes(tool?.action ?? "")) {
    return Infinity;
  }
  return blockDestructionTimeMs(block, tool) / 1.5;
}

export function entityDps(tool: Item | undefined, entity: ReadonlyEntity) {
  const asNpc = Npc.from(entity);
  if (asNpc) {
    const npcType = idToNpcType(asNpc.npc_metadata.type_id);
    if (!npcType.behavior.damageable) {
      return 0;
    }
  }

  return baseDps(tool);
}

export function groupDestructionTimeMs(
  voxeloo: VoxelooModule,
  localUserId: number,
  groupComponent: GroupComponent | undefined,
  creatorId: BiomesId | undefined,
  tool: Item | undefined
) {
  if (!groupComponent?.tensor) {
    return 1000;
  }
  if (creatorId === localUserId) {
    return 2000; // creator can break groups quickly
  }
  return using(new voxeloo.GroupTensor(), (tensor) => {
    tensor.load(groupComponent.tensor);
    let timeMs = 0;
    for (const { tensorEntry } of scanGroupTensor(tensor)) {
      if (isBlockGroupEntry(tensorEntry)) {
        const blockId = tensorEntry.block.block_id;
        timeMs += blockDestructionTimeMs(anItem(blockId), tool);
      }
    }
    return timeMs;
  });
}

export function damagePerEntityAttack(
  tool: Item | undefined,
  entity: ReadonlyEntity
) {
  return entityDps(tool, entity) * attackIntervalSeconds(tool);
}

export function attackIntervalSeconds(_tool: Item | undefined) {
  return npcGlobals().playerAttackInterval;
}

export function groupHardnessClass(
  voxeloo: VoxelooModule,
  groupComponent: GroupComponent | undefined
) {
  if (!groupComponent?.tensor) {
    return 2;
  }
  return using(new voxeloo.GroupTensor(), (tensor) => {
    tensor.load(groupComponent.tensor);
    let maxHardness = 2;

    for (const { tensorEntry } of scanGroupTensor(tensor)) {
      if (isBlockGroupEntry(tensorEntry)) {
        const hardness = anItem(tensorEntry.block.block_id).hardnessClass;
        maxHardness = Math.max(maxHardness, hardness);
      }
    }
    return maxHardness;
  });
}

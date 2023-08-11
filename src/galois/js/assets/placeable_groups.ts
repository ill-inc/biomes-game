import { shapeIDs } from "@/galois/assets/shapes";
import { terrainIDs } from "@/galois/assets/terrain";
import * as l from "@/galois/lang";
import { BikkieIds } from "@/shared/bikkie/ids";

function write(
  isomorphism: l.BlockIsomorphism,
  box:
    | [[number, number, number], [number, number, number]]
    | [number, number, number]
) {
  if (box.length == 3) {
    const [x, y, z] = box;
    box = [
      [x, y, z],
      [x + 1, y + 1, z + 1],
    ];
  }
  return l.Write(l.EmptyBlockShapeTensor(), l.BoxMask([box]), isomorphism);
}

function merge(terrain: l.BlockShapeTensor[]): l.BlockShapeTensor {
  if (terrain.length == 0) {
    return l.EmptyBlockShapeTensor();
  } else {
    return l.Merge(terrain.shift()!, merge(terrain));
  }
}

const workbenchTerrain = l.Write(
  l.EmptyTerrainTensor(),
  l.BoxMask([
    [
      [0, 0, 0],
      [1, 1, 3],
    ],
  ]),
  terrainIDs["oak_log"]
);

const workbenchShapes = merge([
  write(l.ToBlockIsomorphism(shapeIDs.step, 43), [0, 0, 0]),
  write(l.ToBlockIsomorphism(shapeIDs.full, 0), [0, 0, 1]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 46), [0, 0, 2]),
]);

export const workbenchGroup = l.ToGroupTensor(
  workbenchTerrain,
  workbenchShapes,
  l.EmptyDyeTensor(),
  l.EmptyMoistureTensor(),
  l.EmptyGrowthTensor()
);

const tailoringBoothTerrain = l.Merge(
  l.Write(
    l.EmptyTerrainTensor(),
    l.BoxMask([
      [
        [0, 0, 0],
        [1, 1, 4],
      ],
    ]),
    terrainIDs["oak_lumber"]
  ),
  l.Write(
    l.EmptyTerrainTensor(),
    l.BoxMask([
      [
        [2, 0, 0],
        [3, 1, 4],
      ],
    ]),
    terrainIDs["stone"]
  )
);

const tailoringBoothShapes = merge([
  write(l.ToBlockIsomorphism(shapeIDs.step, 5), [0, 0, 0]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 46), [2, 0, 0]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 5), [0, 0, 1]),
  write(l.ToBlockIsomorphism(shapeIDs.slab, 2), [2, 0, 1]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 5), [0, 0, 2]),
  write(l.ToBlockIsomorphism(shapeIDs.slab, 2), [2, 0, 2]),
  write(l.ToBlockIsomorphism(shapeIDs.full, 0), [0, 0, 3]),
  write(l.ToBlockIsomorphism(shapeIDs.full, 0), [2, 0, 3]),
]);

export const tailoringBoothGroup = l.ToGroupTensor(
  tailoringBoothTerrain,
  tailoringBoothShapes,
  l.EmptyDyeTensor(),
  l.EmptyMoistureTensor(),
  l.EmptyGrowthTensor()
);

const thermoblasterTerrain = l.Clear(
  l.Write(
    l.EmptyTerrainTensor(),
    l.BoxMask([
      [
        [0, 0, 0],
        [3, 3, 3],
      ],
    ]),
    terrainIDs["stone"]
  ),
  l.BoxMask([
    [
      [1, 1, 1],
      [2, 2, 2],
    ],
  ])
);

const thermoblasterShapes = merge([
  l.Clear(
    write(l.ToBlockIsomorphism(shapeIDs.full, 0), [
      [0, 0, 0],
      [3, 3, 3],
    ]),
    l.BoxMask([
      [
        [1, 1, 1],
        [2, 2, 2],
      ],
    ])
  ),
  write(l.ToBlockIsomorphism(shapeIDs.slab, 7), [2, 0, 1]),
  write(l.ToBlockIsomorphism(shapeIDs.fence, 5), [2, 1, 1]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 41), [
    [0, 2, 0],
    [3, 3, 1],
  ]),
  write(l.ToBlockIsomorphism(shapeIDs.step, 44), [
    [0, 2, 2],
    [3, 3, 3],
  ]),
]);

export const thermoblasterGroup = l.ToGroupTensor(
  thermoblasterTerrain,
  thermoblasterShapes,
  l.EmptyDyeTensor(),
  l.EmptyMoistureTensor(),
  l.EmptyGrowthTensor()
);

export const traditionalShelterFrameGroup = l.LoadGroupTensor(
  "KLUv/WCwEYUPAPQRAWWQkG4AAAAAIP9/9AAAAAEPAIAPHwCAHQAAAJkZAIAlLTU9RQBSAAAAEREAAFZaXmt4AIB5AAQAgAIAAAAxBgCACA4UFhwiKCowNjwAPT4GAABBQkVGSUpNTlFSVVZZWl1eYWJlZmlqbW5xcnV2eXp9foGChYaJio2OAAAAAgUAgJKAlpqeoqaqrrK2ur4AwQAAAIUCAADFyc3RAAAASgEAANXZ3eEAAAC0AAAA5ent8QAAAEgAAADzAAAA9ff5+/3/AQEDAQUHCQsNDxETFRcZGx0fISMlASYAEAoDBACAAAEAAwcAgJSYnKC4vMDEhwMAAM/V284BAADn7fP8BQELEQF4KSstLzM1Nzk7PT9BQ0VHSUtNTkDAxamFqYCAwKhQ7ACCgAAwAyANAAYSYCEk1hBNAAARBMiDBGSRAAACW3A5+BavOQ9RrRaZe8d74R8dC+B8KC0+jobB+WsPD/8u3J6heMa5upx599GgyA8SjyOkvEezKGXhDyI8wtcYoq94NDaQ/iLVS9OHr3GMNHRgb3c8I7Uu/2gu4NkIBAOMCIT+Hdlzo1/UGWUjcU4fAxzRSS8Y4JDUjSP5hCYZ01rOEHRI0urMZEZjMqMxmXHGWPLusDMCmRiEGjuLw/NsDEGHYDqWJw/wjStf+3U="
);

export const modernShelterFrameGroup = l.LoadGroupTensor(
  "KLUv/WBQEX0PABYRQTfQHqEA+JkfBlw8PCce4pxc3AgnwC+BfCbESROlqiMUcsN1tXKLwfjuiA91a8ALs/Tcsmy8JOt7LgAuADMAGxcRPp7C7q42f4A7Os19RqiSgvK63r8OklHhuwt0/DyE+4D9v5ZxD/9KJtNoA1lYTiqpJtTb3//EtGRUNCS0/Kv+IJ8eZU4SefxXfmPNdSF+yiIM/hM/cJP1EpH2uy63Q8exN8WYIfBkHfnQwHiU4K2FRK+BIcHABlj71vZp+qu9GvWnoZ2VkYndsKdXl1ZgvyTyKEMMkoRwUEA4qAsHBTm43djWxri2rqycb5//lFOTUhLSEdFvBvTDs5P8dWyKMC8tQ48DgKeoscwEICDMIAHQArChAXASwAEg7ACCISAC+YD8IoEBW6gd/kN3NNvRFa7VulCPgK3FKOJvgG+8IQZVWAr8DGxiBjwixs8wkqWxXiFPoObGHkMaazmKhg308RqknYSPfYYw2AAzYnSoQ81YiStqaPQzBNjZa+RpxAfyEB24CS5efyPVW/6BYs8flLF9L4hEPnvNOUW4aDl7IwT58nZiJqm2X25haL/KD2us3kTMHYLeqcXBGmhDqg09xAyAMNQhM0DDMnITxxno7gcmE7pDa7FEXlnZXPvaff7ygKzsMphQE37rze/4VQ=="
);

export const spaceAgeShelterFrameGroup = l.LoadGroupTensor(
  "KLUv/WC4DWUKAPJNLjEwdZAAUqdePaBfox+RWdgQwHIe+XUe0umYJKfA6wcAFxeFrhPNxolwqLAkoJz5k+8BIbrvaRPISuBWLoVylWpJm05HOnpL3ehN9iKiIaFBgX583gPVe94Wz7sC+E6ODY1GZhYD8+LS8lZUUlBOTEhkIyEgHx4dHBsaGRtYVOxoj01EPGwIW0h4XS+r4FXdfPUAzlGfZm7aBcR4L95qp9gUu4QDjEHhdavmrl+p17nrsCwhfMlsJuICUahBqGkmIQxhCQmggjE6jhgSQEE01BPMBDNx8v+3tLQDW8ABUj3DchuXRk56oSMschMbZVQIqdq4Z9gGR9B0q/tLO/ZFXHruWCfDQGJGxyxGlXPjW3j7sRiDjrJZuZGPWVqkgUbZVszoxpYW4gbEd7XBGnkqDobnfxC63mjHz0jfVnXCZnrkqW4yVab/vvED"
);

export const marinaShoppingStallGroup = l.LoadGroupTensor(
  "KLUv/WDoAi0HABLHGSaASwAMRmOYwmFMY6XsVZoASpKSKzCYHDIk2kmxrf36+1c/7ZY8DxpMppKSpHg4m84feTgai76zqlKGCJ73QAGOYSUQVwdqkgqEOHg3tqAPf6jfnrp0FF+f/awf//whl4/i33JdkwxBqBHBV2ENRQegAiqy8RJAMjC+UFHBTEUTM/mr7LYBW0ALr3ffqQ+0v6QUkzF0TgHH08sf0XfQlPiomzz0MT2Yxlap86FZG9KAf5RpwC73M47TRrCDgx+KHkfp0abCxSeH1hGwhZEyZJgzjfe9LJVopo4geRLAE/cb3x8="
);

export const canopyFrameGroup = l.LoadGroupTensor(
  "KLUv/WByA60FAFQGAWWQkG4AAAAAIP9/WgAAAAEAAAB/AACACgAAAIEBAIAOEhYaHiIBAAArAIAsAIEBAAADBAcICwwPEBMUFxgbHB8gIyQnKC8wAQCAMgAAAJkBAIA4PkRGTFJYAFlaAAAADAqAAAE1qJHYW1hj2A5Qw5A0GBGACGEnbaH+/1cHW5AfHIvNIAXGTKYURAKXpEu5Cw/bA5AT7hcH/gaKVbjfDTkTSGoa3yCVfjItmA1emOpJ/wE="
);

export const thermoliteGroup = l.LoadGroupTensor(
  "KLUv/WBwAc0DAHQDAWWQkG4AAAAAIP9/HAAAAAEAAAADAACABQAAAAcAAIAJAAwAgA0AAQIEgAYIAAkKBAqAAUDp7B2g8BjX2jeAAnM0e1sg5d9obL+GfiHJHPyjitqygRnl8AENscnBfTdaH+E25AR/Zz3H76/r0r4M7dK2b5w2ugw="
);

export const kitchenGroup = l.LoadGroupTensor(
  "KLUv/WDQAOUCAIQCAWWQkG4AAAAAIP9/DgAAAAGABAUAgAYAAx8AAAAhCoAAAQBAAAAArhYgoIJjYx1bIAUAgaWr+xIa0M9QPpxFUIRMgGQX5kOp02IDt7DnLW3YDmz4OTxsNgQS"
);

export const benchGroup = l.LoadGroupTensor(
  "KLUv/WA2AQ0DAJQCAWWQkG4AAAAAIP9/EgAAAAGABAAAAAcAAACACAACBQYMCgOABACAAcAZoBBVSrUG4IKqYB5bkKIlg9xM94PuAmKBe24fR41A2JmczKgzj/3sQr7bl8xIMHbJu0NuiBQ="
);
export const fenceGroup = l.LoadGroupTensor(
  "KLUv/WBiAeUDAIQDAWWQkG4AAAAAIP9/FgAAAAGABAAAAB8AAAAJAIAKAAIGCAwKA4AEAIABFA8AAAAICQMFAAYHRQEhoNAYFwQF8AKiYDRbYIpHklC9SaZcQ3ZEhnUziZnd8Z0uoCXS2a1xeoqGk5UpN3bd1vs01tm2lowhwGxC48Z+A/Y="
);
export const tableGroup = l.LoadGroupTensor(
  "KLUv/WAmAa0DAIQDAWWQkG4AAAAAIP9/EgAAAAGABAAAAAcAAACACAACAACAAgQABQYMCgOABACAAAEQAwcDggAAAIcboJDsFDZrwAKrMHdbQAqzCmp4bcFvtilPWGS2T7dU2DSYMZwfgwOzc2WMfL5Vedbsg4fc3EQmGnJDpA=="
);
export const tTableGroup = l.LoadGroupTensor(
  "KLUv/WAWARUDAOQCAWWQkG4AAAAAIP9/EAAAAAGABAAAAAMAAAAGAIAHAAQAAIACAAMEAAwKAQHr7hUgwAIyIg9bkMKMLlyudlCjwmSTMg1uQUCEXICySydjeOB3+IRsyLWBX9ZBm8V7gyIB"
);

export const networkTowerGroup = l.LoadGroupTensor(
  "KLUv/WCWAl0GAKLGFyOQyQgwtDB4FYbhM0EFqJ40ZYp7Aw7hcjubXRIS2tD+kvL7Hlt0IlGIBnPJKBKCVYTn2FL7Doa+L5kk4nCEBdfYLsCTfrSPjrsBvsZ+5x/86g/sP379G5XN4p8yZ0QDPKgByapQaj8D8IIp2jgRYIiipUBGwkRJUflVKQwHW2gFv368bfAaflUqDLpVY8vAFomBRebGLhmqh5+aD+FMIDgqjBFeioF2tjevGkqQisnFMCPN5WqcpppHd+DmH/aglg3sdu9ItSnU"
);

export const commsTowerGroup = l.LoadGroupTensor(
  "KLUv/WDeAV0FALLFEx+wJyj//w++7dAYZG85YhiN9CTaiJwjcv+fMsmUfvo9ksYjMdht1Hoc5lYc0rucWq0xzXChATsHsKiFS4DeXBBg68qfe/H0RGSCeEgUOVItoJGwSWFx6xvQgiGa21vAdL6Q7no9MCB6nK/JsvJb5VJG8blIcs0wIxsVMQ/OkifG9ZAz9pd6vo4947ROkif5It+45yxmBznmJvtlGCvW4uhyx60TV48XFQ=="
);

export const seedMillGroup = l.LoadGroupTensor(
  "KLUv/WBeARUEAFQDAWWQkG4AAAAAIP9/GgAAAAEAAAAHAACABoAICgALAIAMAAECAwQFBksECoABFgAHAAkKRYUioLBe19IAcIJiRNUDW1hqhkRQ3Xl7dQTXEDPpLolzd3dHvLoAf6HhOI/NwIcwZJLQ7X29bb12co4zu29/v5wzw0TxgzO3d/gN/AM="
);

export const dyeOMaticGroup = l.LoadGroupTensor(
  "KLUv/WCCAaUEANKEEBygMQCAPjKzzQkWAHROm5lNCAE88dK99N53l30HgIZJiKgE1D/F3bO4jGSDSucM+jnR2Y//UqN++u8/lgDyr7SWXCegcCoNmjUA0AIiqDJbQGqO0d24xgNnbZlzw3TPXEl8py79CO/tv9ZVKjANZgdH5kzwjJwSN7qXMIydgXvO7jQ7xnRl7y6ryb1DO+6NJQM="
);

export const anglersTableGroup = l.LoadGroupTensor(
  "KLUv/WA6Ae0DAGQDAWWQkG4AAAAAIP9/FgAAAAEAAAADAACABQgJAIAKAAQAAIACAAMEBQYnJgqAAAESBgcIAgDuH6CQMBU2NgOQArKi21ugdF5C97u3lMKukkzzK5mWhjpQYfNYlo2z8wFWZSSUdOi9/nK9XbhzV4OuTbyx5M3B0c2lYywD"
);

export const composterGroup = l.LoadGroupTensor(
  "KLUv/WAmAdUDAFQDAWWQkG4AAAAAIP9/FAAAAAEAAAADAACABYAHCACACQAHgAQAAAAFBh8hCoAAAQ4BAQBFQAEdoKCeKWxsBnACQ2PmAVs4RUZGNOQMiLsPTXVpR05GKjQN5NEoOwtiIROwBNePt98W59zRz+9cH7Bm4dtPLp44bRgZ"
);

const blueprintDefs = [
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintWorkbench,
    "Workbench",
    workbenchGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintTailoringBooth,
    "Tailoring Booth",
    tailoringBoothGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintThermoblaster,
    "Thermoblaster",
    thermoblasterGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintTraditionalShelterFrame,
    "Traditional Shelter Frame",
    traditionalShelterFrameGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintModernShelterFrame,
    "Modern Shelter Frame",
    modernShelterFrameGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintSpaceAgeShelterFrame,
    "Space Age Shelter Frame",
    spaceAgeShelterFrameGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintMarinaShoppingStall,
    "Stall Frame",
    marinaShoppingStallGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintCanopyFrame,
    "Canopy Frame",
    canopyFrameGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintThermolite,
    "Thermolite",
    thermoliteGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintKitchen,
    "Kitchen",
    kitchenGroup
  ),
  l.ToBlueprintGroupDefinition(BikkieIds.blueprintBench, "Bench", benchGroup),
  l.ToBlueprintGroupDefinition(BikkieIds.blueprintFence, "Fence", fenceGroup),
  l.ToBlueprintGroupDefinition(BikkieIds.blueprintTable, "Table", tableGroup),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintTTable,
    "T-Table",
    tTableGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintNetworkTower,
    "Network Tower",
    networkTowerGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintCommsTower,
    "Comms Tower",
    commsTowerGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintSeedMill,
    "Seed Mill",
    seedMillGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintDyeOMatic,
    "Dye-O-Matic",
    dyeOMaticGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintAnglersTable,
    "Angler's Table",
    anglersTableGroup
  ),
  l.ToBlueprintGroupDefinition(
    BikkieIds.blueprintComposter,
    "Composter",
    composterGroup
  ),
] as const;

export function getAssets(): Record<string, l.Asset> {
  return {
    "definitions/blueprint_data": l.ToBlueprintGroupDefinitions(blueprintDefs),
  };
}

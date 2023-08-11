import type { blockIDs } from "@/galois/assets/blocks";
import { blockAtlas, blockIndex, colorIDs } from "@/galois/assets/blocks";
import type { floraIDs } from "@/galois/assets/florae";
import { floraAtlas, floraIndex } from "@/galois/assets/florae";
import { glassAtlas, glassIndex } from "@/galois/assets/glass";
import { groupIndex } from "@/galois/assets/groups";
import {
  tailoringBoothGroup,
  thermoblasterGroup,
  traditionalShelterFrameGroup,
  workbenchGroup,
} from "@/galois/assets/placeable_groups";
import { shapeIDs, shapeIndex } from "@/galois/assets/shapes";
import { terrainIDs } from "@/galois/assets/terrain";
import * as l from "@/galois/lang";

function write(terrainID: keyof typeof terrainIDs, box: l.BoxLike) {
  return l.Write(
    l.EmptyTerrainTensor(),
    l.BoxMask([box]),
    terrainIDs[terrainID]
  );
}

function merge(terrain: l.TerrainTensor[]): l.TerrainTensor {
  if (terrain.length == 0) {
    return l.EmptyTerrainTensor();
  } else {
    return l.Merge(terrain.shift()!, merge(terrain));
  }
}

// Define a scene consistenting of a slab of grass on dirt.
const platform = merge([
  write("dirt", [
    [0, 0, 0],
    [14, 4, 14],
  ]),
  write("grass", [
    [0, 4, 0],
    [14, 5, 14],
  ]),
  write("grass", [
    [1, 5, 12],
    [12, 6, 13],
  ]),
  write("dirt", [
    [1, 5, 13],
    [13, 6, 14],
  ]),
  write("grass", [
    [1, 6, 13],
    [12, 7, 14],
  ]),
]);

// Define a scene consistenting of a tree.
function makeTree(
  leaf: keyof typeof floraIDs,
  log: keyof typeof blockIDs,
  height: number
) {
  return merge([
    write(leaf, [
      [1, height, 1],
      [4, height + 5, 4],
    ]),
    write(leaf, [
      [1, height + 1, 0],
      [4, height + 4, 5],
    ]),
    write(leaf, [
      [0, height + 1, 1],
      [5, height + 4, 4],
    ]),
    write(leaf, [
      [0, height + 2, 0],
      [5, height + 3, 5],
    ]),
    write(log, [
      [2, 0, 2],
      [3, height + 2, 3],
    ]),
  ]);
}

// Define a scene consistenting of a tree.
const birchTree = makeTree("birch_leaf", "oak_log", 6);
const oakTree = makeTree("oak_leaf", "birch_log", 5);
const rubberTree = makeTree("rubber_leaf", "rubber_log", 4);

// Define a scene consistenting of a single oak log
const step = merge([
  write("oak_log", [
    [3, 5, 3],
    [3, 6, 3],
  ]),
]);

// Define a scene consistenting of some grass strands.
const grassStrands = merge([
  write("switch_grass", [
    [6, 5, 5],
    [9, 6, 9],
  ]),
  write("switch_grass", [
    [6, 5, 4],
    [8, 6, 11],
  ]),
  write("switch_grass", [
    [3, 5, 5],
    [9, 6, 8],
  ]),
  write("azalea_flower", [
    [8, 5, 11],
    [9, 6, 12],
  ]),
  write("bell_flower", [
    [11, 5, 6],
    [12, 6, 7],
  ]),
  write("dandelion_flower", [
    [6, 5, 6],
    [7, 6, 7],
  ]),
  write("daylily_flower", [
    [8, 5, 4],
    [9, 6, 5],
  ]),
  write("lilac_flower", [
    [2, 5, 7],
    [3, 6, 8],
  ]),
  write("rose_flower", [
    [4, 5, 4],
    [5, 6, 5],
  ]),
  write("cotton_bush", [
    [4, 5, 8],
    [5, 6, 9],
  ]),
  write("hemp_bush", [
    [7, 5, 7],
    [8, 6, 8],
  ]),
  write("red_mushroom", [
    [9, 5, 11],
    [10, 6, 12],
  ]),
]);

const window = write("simple_glass", [
  [0, 0, 0],
  [2, 1, 2],
]);

// Define a scene consistenting of a tree sitting on a platform.
const simple = l.Apply(
  merge([
    platform,
    step,
    grassStrands,
    l.Apply(birchTree, l.Translate(8, 5, 3)),
    l.Apply(oakTree, l.Translate(4, 5, 0)),
    l.Apply(rubberTree, l.Translate(2, 5, 8)),
    l.Apply(window, l.Translate(2, 5, 3)),
  ]),
  l.Translate(1, 1, 1)
);

// Extract the block and glass tensors from the simple scene.
const simpleBlocks = l.ToBlockTensor(simple);
const simpleGlass = l.ToGlassTensor(simple);

// Build the simple scene's block shape tensor.
const simpleBlockShapes = l.Merge(
  l.ToBlockShapeTensor(simpleBlocks, l.ToBlockIsomorphism(shapeIDs.full, 0)),
  l.Merge(
    l.Write(
      l.EmptyBlockShapeTensor(),
      l.BoxMask([
        [
          [5, 6, 11],
          [6, 12, 12],
        ],
      ]),
      l.ToBlockIsomorphism(shapeIDs.log, 0)
    ),
    l.Merge(
      l.Write(
        l.EmptyBlockShapeTensor(),
        l.PointMask([[3, 6, 3]]),
        l.ToBlockIsomorphism(shapeIDs.knob, 0)
      ),
      l.Write(
        l.EmptyBlockShapeTensor(),
        l.PointMask([
          [2, 5, 2],
          [3, 5, 2],
        ]),
        l.ToBlockIsomorphism(shapeIDs.path, 0)
      )
    )
  )
);

// Build the occlusion tensor from the block shapes.
const simpleOcclusions = l.ToOcclusionTensor(simpleBlockShapes, shapeIndex);

// Extract the surface blocks.
const simpleBlockSurface = l.ToSurfaceTensor(simpleBlocks, simpleOcclusions);

// Build the lighting buffer for the simple scene.
const simpleBlockLighting = l.ToLightingBuffer(
  simpleBlockSurface,
  simpleBlockShapes
);

// Build the block geometry buffer for the simple scene.
const simpleBlockGeometry = l.ToGeometryBuffer(
  simpleBlockShapes,
  simpleOcclusions,
  shapeIndex
);

// Build the sample key tensor for the simple scene.
const simpleBlockSamples = l.ToBlockSampleTensor(
  simpleBlockSurface,
  l.EmptyDyeTensor(),
  l.EmptyMuckTensor(),
  l.EmptyMoistureTensor(),
  blockIndex
);

// Build the block material buffer for the simple scene.
const simpleBlockMaterial = l.ToMaterialBuffer(simpleBlockSamples);

// Build the block mesh of the simple scene.
const simpleBlockMesh = l.ToMesh(
  simpleBlockGeometry,
  simpleBlockMaterial,
  simpleBlockLighting,
  blockAtlas
);

// Extract the flora tensor from the simple scene.
const simpleFlorae = l.ToFloraTensor(simple);

// Build the flora geometry buffer for the simple scene.
const simpleFloraGeometry = l.ToGeometryBuffer(
  simpleFlorae,
  l.Write(
    l.EmptyGrowthTensor(),
    l.BoxMask([
      [
        [0, 0, 0],
        [30, 30, 30],
      ],
    ]),
    1
  ),
  floraIndex
);

// Build the flora lighting buffer for the simple scene.
const simpleFloraLighting = l.ToLightingBuffer(simpleFlorae, simpleBlockShapes);

// Build the flora mesh of the simple scene.
const simpleFloraMesh = l.ToMesh(
  simpleFloraGeometry,
  simpleFloraLighting,
  floraAtlas
);

const simpleGlassSamples = l.ToBlockSampleTensor(
  simpleGlass,
  l.EmptyDyeTensor(),
  l.EmptyMuckTensor(),
  l.EmptyMoistureTensor(),
  glassIndex
);
const simpleGlassShapes = l.ToBlockShapeTensor(
  simpleGlass,
  l.ToBlockIsomorphism(shapeIDs.full, 0)
);
const simpleGlassOcclusions = l.ToGlassOcclusionTensor(
  simpleGlassShapes,
  simpleGlass,
  l.EmptyDyeTensor(),
  shapeIndex
);
const simpleGlassLighting = l.ToLightingBuffer(simpleGlass, simpleGlassShapes);
const simpleGlassGeometry = l.ToGeometryBuffer(
  simpleGlassShapes,
  simpleGlassOcclusions,
  shapeIndex
);
const simpleGlassMaterial = l.ToMaterialBuffer(simpleGlassSamples);
const simpleGlassMesh = l.ToGlassMesh(
  simpleGlassGeometry,
  simpleGlassMaterial,
  simpleGlassLighting,
  glassAtlas
);

// Build the final combined mesh of the simple scene.
const simpleMesh = l.ToMesh(simpleBlockMesh, simpleFloraMesh, simpleGlassMesh);

// Build a group tensor from the scene tensors.
const groupTensor = l.ToGroupTensor(
  simple,
  simpleBlockShapes,
  l.EmptyDyeTensor(),
  l.EmptyMoistureTensor(),
  l.EmptyGrowthTensor()
);

// Build a group mesh version of the scene.
const groupMesh = l.ToMesh(groupTensor, groupIndex);

// MATT DEBUGGING CODE:
const slab = merge([
  write("simple_glass", [
    [0, 0, 0],
    [1, 1, 1],
  ]),
  write("simple_glass", [
    [1, 0, 0],
    [2, 1, 1],
  ]),
]);

const slabDyeTensor = l.Merge(
  l.Write(
    l.EmptyDyeTensor(),
    l.BoxMask([
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
    ]),
    colorIDs.red
  ),
  l.Write(
    l.EmptyDyeTensor(),
    l.BoxMask([
      [
        [1, 0, 0],
        [2, 1, 1],
      ],
    ]),
    0
  )
);

// Define the slab group tensor.
const slabGlassTensor = l.ToGlassTensor(slab);
const slabGroupTensor = l.ToGroupTensor(
  slab,
  l.ToBlockShapeTensor(slabGlassTensor, l.ToBlockIsomorphism(shapeIDs.full, 0)),
  slabDyeTensor,
  l.Write(
    l.EmptyMoistureTensor(),
    l.BoxMask([
      [
        [0, 0, 0],
        [2, 2, 2],
      ],
    ]),
    0
  ),
  l.EmptyGrowthTensor()
);

// Build geometry from the blocks.
const slabMesh = l.ToMesh(slabGroupTensor, groupIndex);

const slabWireframeMesh = l.ToWireframeMesh(slabGroupTensor, shapeIndex);

// Glass testing
const glass = merge([
  write("simple_glass", [
    [0, 0, 0],
    [2, 1, 1],
  ]),
]);

const glassGlass = l.ToGlassTensor(glass);
const glassShapes = l.Write(
  l.EmptyBlockShapeTensor(),
  l.BoxMask([
    [
      [0, 0, 0],
      [2, 1, 1],
    ],
  ]),
  l.ToBlockIsomorphism(shapeIDs.full, 0)
);
const glassDyes = l.EmptyDyeTensor();
const glassSamples = l.ToBlockSampleTensor(
  glassGlass,
  glassDyes,
  l.EmptyMuckTensor(),
  l.EmptyMoistureTensor(),
  glassIndex
);
const glassOcclusions = l.ToGlassOcclusionTensor(
  glassShapes,
  glassGlass,
  glassDyes,
  shapeIndex
);
const glassLighting = l.ToLightingBuffer(glassGlass, glassShapes);
const glassGeometry = l.ToGeometryBuffer(
  glassShapes,
  glassOcclusions,
  shapeIndex
);
const glassMaterial = l.ToMaterialBuffer(glassSamples);
const glassMesh = l.ToGlassMesh(
  glassGeometry,
  glassMaterial,
  glassLighting,
  glassAtlas
);

export function getAssets(): Record<string, l.Asset> {
  return {
    "debug/simple_block_geometry": simpleBlockGeometry,
    "debug/simple_block_lighting": simpleBlockLighting,
    "debug/simple_block_material": simpleBlockMaterial,
    "debug/simple_block_mesh": simpleBlockMesh,
    "debug/simple_block_shapes": simpleBlockShapes,
    "debug/simple_block_surface": simpleBlockSurface,
    "debug/simple_blocks": simpleBlocks,
    "debug/simple_flora_geometry": simpleFloraGeometry,
    "debug/simple_flora_lighting": simpleFloraLighting,
    "debug/simple_flora_mesh": simpleFloraMesh,
    "debug/simple_florae": simpleFlorae,
    "debug/simple_group_tensor": groupTensor,
    "debug/simple_mesh": simpleMesh,
    "debug/simple_occlusions": simpleOcclusions,
    "scenes/group": groupMesh,
    "scenes/platform": platform,
    "scenes/simple": simple,
    "scenes/tree_birch": birchTree,
    "scenes/tree_oak": oakTree,
    "scenes/tree_rubber": rubberTree,

    // MATT DEBUG STUFF
    "scenes/slab_mesh": slabMesh,
    "scenes/slab_wireframe_mesh": slabWireframeMesh,
    "scenes/glass_mesh": glassMesh,

    "scenes/workbench_mesh": l.ToMesh(workbenchGroup, groupIndex),
    "scenes/tailoring_booth_mesh": l.ToMesh(tailoringBoothGroup, groupIndex),
    "scenes/thermoblaster_mesh": l.ToMesh(thermoblasterGroup, groupIndex),
    "scenes/traditional_shelter_frame_mesh": l.ToMesh(
      traditionalShelterFrameGroup,
      groupIndex
    ),
  };
}

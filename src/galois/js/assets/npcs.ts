import type { WearableParams } from "@/galois/assets/wearables";
import { animatedcharacterMeshFromWearables } from "@/galois/assets/wearables";
import * as l from "@/galois/lang";

type SkeletonData = [string, SkeletonData[]];
export const mucklingSkeletonData: [string, SkeletonData[]] = [
  "Armature",
  [
    [
      "Body",
      [
        ["Head", []],
        ["L_Leg", []],
        ["R_Leg", []],
      ],
    ],
  ],
];

const DEFAULT_VOX_TO_WORLD_SCALE = 0.1;

// Some of the older NPC meshes were created with a different scale of 0.05.
const OLD_VOX_TO_WORLD_SCALE = 0.05;

// Associates a "joint index" with each skeleton bone, which has a couple of
// uses. First is that it dictates the per-vertex joint index used for skinning,
// though the order doesn't really matter. However we additionally use it to
// break ties with respect to polygon offsetting, so that we can ensure that
// polygons associated with one joint will not z-fight with coplanar polygons
// from another joint. Joints higher in the list will render first
const mucklingJointOrdering: string[] = ["Body", "Head", "L_Leg", "R_Leg"];
export const mucklingSkeleton = l.toSkeleton(mucklingSkeletonData);

export function voxForNpc(x: NpcEntry) {
  if (x.assembly.kind !== "skeleton") {
    throw new Error("Expected to receive a skeleton assembly.");
  }
  return l.LoadVox(
    x.assembly.animationTemplate.voxFile ?? voxPathFromNpcName(x.name)
  );
}

// Convert from the coordinate space that the animations are defined
// within to the coordinate space that the game is looking for.
const transformFromPoseToGame = l.AffineFromList([
  l.AffineFromAxisRotation([0, 1, 0], 90),
]);

function animatedNpcGltf(
  vox: l.GeneralNode<"Vox">,
  animationsPath: string,
  { skeleton, jointOrdering, voxToWorldScale, meshScale }: NpcAnimationTemplate
) {
  const animationsGltf = l.LoadGLTF(animationsPath);

  const tPose = l.ExtractInitialPose(animationsGltf, skeleton);

  const posedVoxJointMap = l.ToPosedVoxJointMapFromVoxLayers(vox, skeleton);

  const s = voxToWorldScale ?? DEFAULT_VOX_TO_WORLD_SCALE;
  const posedVoxTransformToAnimationCoords: l.GLTFTransformLike = [
    [0, 0, 0],
    [-0.7071068, 0, 0, 0.7071068],
    [s, s, s],
  ];

  const meshJointMap = l.ToSkinnedMeshJointMap(
    posedVoxJointMap,
    tPose,
    posedVoxTransformToAnimationCoords, // Needed to align the .vox content with the tPose.
    jointOrdering
  );

  let gltf = l.ToGLTF(
    meshJointMap,
    tPose,
    l.ExtractAllAnimations(animationsGltf, skeleton)
  );

  gltf = l.TransformGLTF(gltf, transformFromPoseToGame);
  if (meshScale !== undefined) {
    gltf = l.TransformGLTF(
      gltf,
      l.AffineFromScale([meshScale, meshScale, meshScale])
    );
  }

  return gltf;
}

export interface NpcAnimationTemplate {
  animationFile?: string;
  voxFile?: string;
  skeleton: l.Skeleton;
  jointOrdering: string[];
  voxToWorldScale?: number;
  meshScale?: number;
}

export interface NpcEntry {
  name: string;
  assembly:
    | {
        kind: "skeleton";
        animationTemplate: NpcAnimationTemplate;
      }
    | {
        kind: "player";
        wearableParams: WearableParams;
      };
}

export const CLIENT_INCLUDE_ANIMATIONS = [
  "Idle",
  "Waving",
  "Walking",
  "Running",
  "Attack",
];

const buddyAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Chest",
        [
          ["Head", []],
          ["L_Arm", [["L_Forearm", [["L_Hand", []]]]]],
          ["R_Arm", [["R_Forearm", [["R_Hand", [["Sign", []]]]]]]],
        ],
      ],
      [
        "Waist",
        [
          ["L_Thigh", [["L_Leg", [["L_Foot", []]]]]],
          ["R_Thigh", [["R_Leg", [["R_Foot", []]]]]],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Head",
    "L_Foot",
    "R_Foot",
    "L_Hand",
    "R_Hand",
    "Waist",
    "Chest",
    "L_Forearm",
    "R_Forearm",
    "L_Leg",
    "R_Leg",
    "L_Arm",
    "R_Arm",
    "L_Thigh",
    "R_Thigh",
    "Sign",
  ],
  meshScale: 0.333333333,
};

const hexerAnimationTemplate = {
  animationFile: "npcs/hexer_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Head",
        [
          ["R_Cloak_Strips", []],
          ["L_Cloak_Strips", []],
          ["B_Cloak_Strips", []],
        ],
      ],
      ["R_Hand", []],
      ["L_Hand", [["Lantern", []]]],
    ],
  ]),
  jointOrdering: [
    "Head",
    "R_Cloak_Strips",
    "L_Cloak_Strips",
    "B_Cloak_Strips",
    "R_Hand",
    "L_Hand",
    "Lantern",
  ],
  meshScale: 0.333333333,
};

const chrominerAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Head",
        [
          ["Drill", []],
          [
            "M_L_HeadJoint",
            [
              [
                "F_L_HeadJoint",
                [["F_L_Thigh", [["F_L_Leg", [["F_L_Foot", []]]]]]],
              ],
              [
                "B_L_HeadJoint",
                [["B_L_Thigh", [["B_L_Leg", [["B_L_Foot", []]]]]]],
              ],
            ],
          ],
          [
            "M_R_HeadJoint",
            [
              [
                "F_R_HeadJoint",
                [["F_R_Thigh", [["F_R_Leg", [["F_R_Foot", []]]]]]],
              ],
              [
                "B_R_HeadJoint",
                [["B_R_Thigh", [["B_R_Leg", [["B_R_Foot", []]]]]]],
              ],
            ],
          ],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Head",
    "Drill",
    "M_L_HeadJoint",
    "F_L_HeadJoint",
    "F_L_Thigh",
    "F_L_Leg",
    "F_L_Foot",
    "B_L_HeadJoint",
    "B_L_Thigh",
    "B_L_Leg",
    "B_L_Foot",
    "M_R_HeadJoint",
    "F_R_HeadJoint",
    "F_R_Thigh",
    "F_R_Leg",
    "F_R_Foot",
    "B_R_HeadJoint",
    "B_R_Thigh",
    "B_R_Leg",
    "B_R_Foot",
  ],
};

const robotAnimationTemplate = {
  animationFile: "npcs/robot_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Chest",
        [
          ["Head", []],
          ["L_Arm", [["L_Forearm", [["L_Hand", []]]]]],
          ["R_Arm", [["R_Forearm", [["R_Hand", []]]]]],
          ["L_Leg", [["L_Foot", []]]],
          ["R_Leg", [["R_Foot", []]]],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Chest",
    "Head",
    "L_Arm",
    "L_Forearm",
    "L_Hand",
    "R_Arm",
    "R_Forearm",
    "R_Hand",
    "L_Leg",
    "L_Foot",
    "R_Leg",
    "R_Foot",
  ],
  meshScale: 0.5,
};

const roundRobotAnimationTemplate = {
  animationFile: "npcs/round_robot_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      ["Body", []],
      ["T_R_Arm", []],
      ["T_L_Arm", []],
      ["B_R_Arm", []],
      ["B_L_Arm", []],
    ],
  ]),
  jointOrdering: ["Body", "T_R_Arm", "T_L_Arm", "B_R_Arm", "B_L_Arm"],
  meshScale: 0.5,
};

const helpingRobotAnimationTemplate = {
  animationFile: "npcs/helping_robot_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["Head", []],
          [
            "L_Shoulder",
            [
              [
                "L_Arm",
                [
                  [
                    "L_Forearm",
                    [
                      ["L_T_Claw", []],
                      ["L_B_Claw", []],
                    ],
                  ],
                ],
              ],
            ],
          ],
          [
            "R_Shoulder",
            [
              [
                "R_Arm",
                [
                  [
                    "R_Forearm",
                    [
                      ["R_T_Claw", []],
                      ["R_B_Claw", []],
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_Arm",
    "L_B_Claw",
    "L_Forearm",
    "L_Shoulder",
    "L_T_Claw",
    "R_Arm",
    "R_B_Claw",
    "R_Forearm",
    "R_Shoulder",
    "R_T_Claw",
  ],
  meshScale: 0.5,
};

const bigMuckerAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          [
            "Head",
            [
              ["L_Earring", []],
              ["R_Earring", []],
            ],
          ],
          [
            "L_Leg",
            [
              ["L_M_Finger", []],
              ["L_R_Finger", []],
              ["L_L_Finger", []],
            ],
          ],
          [
            "R_Leg",
            [
              ["R_M_Finger", []],
              ["R_R_Finger", []],
              ["R_L_Finger", []],
            ],
          ],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_Earring",
    "R_Earring",
    "L_Leg",
    "L_M_Finger",
    "L_R_Finger",
    "L_L_Finger",
    "R_Leg",
    "R_M_Finger",
    "R_L_Finger",
    "R_R_Finger",
  ],
  voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
};

const cowAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["Head", []],
          ["L_B_Thigh", [["L_B_Leg", []]]],
          ["L_F_Thigh", [["L_F_Leg", []]]],
          ["R_B_Thigh", [["R_B_Leg", []]]],
          ["R_F_Thigh", [["R_F_Leg", []]]],
          ["Tail", []],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_B_Leg",
    "L_B_Thigh",
    "L_F_Leg",
    "L_F_Thigh",
    "R_B_Leg",
    "R_B_Thigh",
    "R_F_Leg",
    "R_F_Thigh",
    "Tail",
  ],
  meshScale: 0.3,
};

const sheepAnimationTemplate = {
  ...cowAnimationTemplate,
};

const catAnimationTemplate = {
  animationFile: "npcs/cat_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          [
            "Head",
            [
              ["L_Ear", []],
              ["R_Ear", []],
            ],
          ],
          [
            "L_B_UpperThigh",
            [["L_B_LowerThigh", [["L_B_Leg", [["L_B_Foot", []]]]]]],
          ],
          [
            "R_B_UpperThigh",
            [["R_B_LowerThigh", [["R_B_Leg", [["R_B_Foot", []]]]]]],
          ],
          ["L_F_Thigh", [["L_F_Leg", [["L_F_Foot", []]]]]],
          ["R_F_Thigh", [["R_F_Leg", [["R_F_Foot", []]]]]],
          [
            "Tail_Root",
            [["Tail_Lower", [["Tail_Middle", [["Tail_Upper", []]]]]]],
          ],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "L_Ear",
    "R_Ear",
    "Head",
    "L_B_Foot",
    "L_B_Leg",
    "L_B_LowerThigh",
    "L_B_UpperThigh",
    "R_B_Foot",
    "R_B_Leg",
    "R_B_LowerThigh",
    "R_B_UpperThigh",
    "L_F_Leg",
    "L_F_Foot",
    "L_F_Thigh",
    "R_F_Foot",
    "R_F_Leg",
    "R_F_Thigh",
    "Tail_Root",
    "Tail_Lower",
    "Tail_Middle",
    "Tail_Upper",
  ],
  meshScale: 0.3,
};

const dogAnimationTemplate = {
  animationFile: "npcs/dog_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          [
            "Head",
            [
              ["L_Ear", []],
              ["R_Ear", []],
            ],
          ],
          [
            "L_B_UpperThigh",
            [["L_B_LowerThigh", [["L_B_Leg", [["L_B_Foot", []]]]]]],
          ],
          [
            "R_B_UpperThigh",
            [["R_B_LowerThigh", [["R_B_Leg", [["R_B_Foot", []]]]]]],
          ],
          ["L_F_Thigh", [["L_F_Leg", [["L_F_Foot", []]]]]],
          ["R_F_Thigh", [["R_F_Leg", [["R_F_Foot", []]]]]],
          ["Tail", []],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "L_Ear",
    "R_Ear",
    "Head",
    "L_B_Foot",
    "L_B_Leg",
    "L_B_LowerThigh",
    "L_B_UpperThigh",
    "R_B_Foot",
    "R_B_Leg",
    "R_B_LowerThigh",
    "R_B_UpperThigh",
    "L_F_Leg",
    "L_F_Foot",
    "L_F_Thigh",
    "R_F_Foot",
    "R_F_Leg",
    "R_F_Thigh",
    "Tail",
  ],
  meshScale: 0.3,
};

const duckAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["B_Neck", [["T_Neck", [["Head", []]]]]],
          ["R_Wing", []],
          ["L_Wing", []],
          ["R_Leg", [["R_Foot", []]]],
          ["L_Leg", [["L_Foot", []]]],
          ["Tail", []],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "B_Neck",
    "T_Neck",
    "Head",
    "R_Wing",
    "L_Wing",
    "R_Leg",
    "R_Foot",
    "L_Leg",
    "L_Foot",
    "Tail",
  ],
  meshScale: 0.3,
};

const fishAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Head",
        [
          [
            "Body",
            [
              ["Tail", []],
              ["R_B_Fin", []],
              ["L_B_Fin", []],
            ],
          ],
          ["R_F_Fin", []],
          ["L_F_Fin", []],
          ["R_M_Fin", []],
          ["L_M_Fin", []],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Head",
    "Body",
    "Tail",
    "R_B_Fin",
    "L_B_Fin",
    "R_F_Fin",
    "L_F_Fin",
    "R_M_Fin",
    "L_M_Fin",
  ],
  meshScale: 0.3,
};

const turtleAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["Head", []],
          ["L_F_Flipper", []],
          ["R_F_Flipper", []],
          ["Tail", []],
          ["R_B_Flipper", []],
          ["L_B_Flipper", []],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_F_Flipper",
    "R_F_Flipper",
    "Tail",
    "R_B_Flipper",
    "L_B_Flipper",
  ],
  meshScale: 0.3,
};

const birdAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["Tail", []],
          ["Head", []],
          ["L_Wing", []],
          ["R_Wing", []],
          ["L_Leg", []],
          ["R_Leg", []],
        ],
      ],
    ],
  ]),
  jointOrdering: ["Body", "Tail", "Head", "L_Wing", "R_Wing", "L_Leg", "R_Leg"],
  meshScale: 0.3,
};

const chickenAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["Neck", [["Head", [["Comb", []]]]]],
          ["Tail", []],
          ["R_Wing", []],
          ["L_Wing", []],
          ["R_Leg", [["R_Foot", []]]],
          ["L_Leg", [["L_Foot", []]]],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Head",
    "Body",
    "Neck",
    "Head",
    "Comb",
    "Tail",
    "R_Wing",
    "L_Wing",
    "R_Leg",
    "R_Foot",
    "L_Leg",
    "L_Foot",
  ],
  meshScale: 0.3,
};

const rabbitAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          ["L_F_Leg", [["L_F_Foot", []]]],
          ["R_F_Leg", [["R_F_Foot", []]]],
          ["Tail", []],
          [
            "Head",
            [
              ["L_Ear", []],
              ["R_Ear", []],
            ],
          ],
          ["L_B_Leg", [["L_B_Foot", []]]],
          ["R_B_Leg", [["R_B_Foot", []]]],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "L_F_Leg",
    "L_F_Foot",
    "R_F_Leg",
    "R_F_Foot",
    "Tail",
    "Head",
    "L_Ear",
    "R_Ear",
    "L_B_Leg",
    "L_B_Foot",
    "R_B_Leg",
    "R_B_Foot",
  ],
  meshScale: 0.3,
};

const mouseAnimationTemplate = {
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Body",
        [
          [
            "Head",
            [
              ["L_Ear", []],
              ["R_Ear", []],
            ],
          ],
          ["L_F_Leg", []],
          ["R_F_Leg", []],
          ["L_B_Leg", []],
          ["R_B_Leg", []],
          ["Tail_Lower", [["Tail_Middle", [["Tail_Upper", []]]]]],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_Ear",
    "R_Ear",
    "L_F_Leg",
    "R_F_Leg",
    "L_B_Leg",
    "R_B_Leg",
    "Tail_Lower",
    "Tail_Middle",
    "Tail_Upper",
  ],
  meshScale: 0.3,
};

const mossyMucklingAnimationTemplate: NpcAnimationTemplate = {
  voxFile: "npcs/mossy_mucker_mesh.vox",
  animationFile: "npcs/mossy_mucker_animations.gltf",
  skeleton: mucklingSkeleton,
  jointOrdering: mucklingJointOrdering,
  voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
};

const dragonMucklingAnimationTemplate: NpcAnimationTemplate = {
  voxFile: "npcs/dragon_mesh.vox",
  animationFile: "npcs/dragon_animations.gltf",
  skeleton: l.toSkeleton([
    "Armature",
    [
      [
        "Head",
        [
          [
            "L_Shoulder",
            [
              [
                "L_B_Main_Wing_Bone",
                [
                  [
                    "L_T_Main_Wing_Bone",
                    [
                      [
                        "L_B_Secondary_Wing_Bone",
                        [
                          [
                            "L_T_Secondary_Wing_Bone",
                            [["L_R_Wing_Membrane", []]],
                          ],
                          ["L_M_Wing_Membrane", []],
                        ],
                      ],
                    ],
                  ],
                  ["L_L_Wing_Membrane", []],
                ],
              ],
            ],
          ],
          [
            "R_Shoulder",
            [
              [
                "R_B_Main_Wing_Bone",
                [
                  [
                    "R_T_Main_Wing_Bone",
                    [
                      [
                        "R_B_Secondary_Wing_Bone",
                        [
                          [
                            "R_T_Secondary_Wing_Bone",
                            [["R_L_Wing_Membrane", []]],
                          ],
                          ["R_M_Wing_Membrane", []],
                        ],
                      ],
                    ],
                  ],
                  ["R_R_Wing_Membrane", []],
                ],
              ],
            ],
          ],
          [
            "Body",
            [
              ["L_Foot", []],
              ["R_Foot", []],
            ],
          ],
        ],
      ],
    ],
  ]),
  jointOrdering: [
    "Body",
    "Head",
    "L_B_Main_Wing_Bone",
    "L_B_Secondary_Wing_Bone",
    "L_Foot",
    "L_L_Wing_Membrane",
    "L_M_Wing_Membrane",
    "L_R_Wing_Membrane",
    "L_Shoulder",
    "L_T_Main_Wing_Bone",
    "L_T_Secondary_Wing_Bone",
    "R_B_Main_Wing_Bone",
    "R_B_Secondary_Wing_Bone",
    "R_Foot",
    "R_L_Wing_Membrane",
    "R_M_Wing_Membrane",
    "R_R_Wing_Membrane",
    "R_Shoulder",
    "R_T_Main_Wing_Bone",
    "R_T_Secondary_Wing_Bone",
  ],
  voxToWorldScale: DEFAULT_VOX_TO_WORLD_SCALE,
  meshScale: 0.25,
};

const seedyMucklingAnimationTemplate: NpcAnimationTemplate = {
  animationFile: "npcs/tree_mucker_animations.gltf",
  skeleton: mucklingSkeleton,
  jointOrdering: mucklingJointOrdering,
  voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
};

export const npcsList: NpcEntry[] = [
  {
    name: "cow",
    assembly: {
      kind: "skeleton",
      animationTemplate: cowAnimationTemplate,
    },
  },
  {
    name: "cobble_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: {
        skeleton: mucklingSkeleton,
        jointOrdering: mucklingJointOrdering,
        voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
      },
    },
  },
  {
    name: "stone_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: {
        skeleton: mucklingSkeleton,
        jointOrdering: mucklingJointOrdering,
        voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
      },
    },
  },
  {
    name: "mossy_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: mossyMucklingAnimationTemplate,
    },
  },
  {
    name: "dragon_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: dragonMucklingAnimationTemplate,
    },
  },
  // TODO: Remove below once it's no longer used.
  {
    name: "tree_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: {
        skeleton: mucklingSkeleton,
        jointOrdering: mucklingJointOrdering,
        voxToWorldScale: OLD_VOX_TO_WORLD_SCALE,
      },
    },
  },
  {
    name: "seedy_muckling",
    assembly: {
      kind: "skeleton",
      animationTemplate: seedyMucklingAnimationTemplate,
    },
  },
  {
    name: "sappy_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: {
        ...seedyMucklingAnimationTemplate,
        meshScale: 2.0,
      },
    },
  },
  {
    name: "jugger_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: { ...mossyMucklingAnimationTemplate, meshScale: 4.0 },
    },
  },
  {
    name: "big_mucker",
    assembly: {
      kind: "skeleton",
      animationTemplate: bigMuckerAnimationTemplate,
    },
  },
  {
    name: "cat",
    assembly: {
      kind: "skeleton",
      animationTemplate: catAnimationTemplate,
    },
  },
  {
    name: "cat_black",
    assembly: {
      kind: "skeleton",
      animationTemplate: catAnimationTemplate,
    },
  },
  {
    name: "dog_1",
    assembly: {
      kind: "skeleton",
      animationTemplate: dogAnimationTemplate,
    },
  },
  {
    name: "dog_2",
    assembly: {
      kind: "skeleton",
      animationTemplate: dogAnimationTemplate,
    },
  },
  {
    name: "dog_3",
    assembly: {
      kind: "skeleton",
      animationTemplate: dogAnimationTemplate,
    },
  },
  {
    name: "duck",
    assembly: {
      kind: "skeleton",
      animationTemplate: duckAnimationTemplate,
    },
  },
  {
    name: "fish",
    assembly: {
      kind: "skeleton",
      animationTemplate: fishAnimationTemplate,
    },
  },
  {
    name: "turtle",
    assembly: {
      kind: "skeleton",
      animationTemplate: turtleAnimationTemplate,
    },
  },
  {
    name: "bird",
    assembly: {
      kind: "skeleton",
      animationTemplate: birdAnimationTemplate,
    },
  },
  {
    name: "chicken",
    assembly: {
      kind: "skeleton",
      animationTemplate: chickenAnimationTemplate,
    },
  },
  {
    name: "rabbit",
    assembly: {
      kind: "skeleton",
      animationTemplate: rabbitAnimationTemplate,
    },
  },
  {
    name: "mouse",
    assembly: {
      kind: "skeleton",
      animationTemplate: mouseAnimationTemplate,
    },
  },
  {
    name: "sheep",
    assembly: {
      kind: "skeleton",
      animationTemplate: sheepAnimationTemplate,
    },
  },
  {
    name: "buddy",
    assembly: {
      kind: "skeleton",
      animationTemplate: buddyAnimationTemplate,
    },
  },
  {
    name: "brown_hexer",
    assembly: {
      kind: "skeleton",
      animationTemplate: hexerAnimationTemplate,
    },
  },
  {
    name: "purple_hexer",
    assembly: {
      kind: "skeleton",
      animationTemplate: hexerAnimationTemplate,
    },
  },
  {
    name: "chrominer",
    assembly: {
      kind: "skeleton",
      animationTemplate: chrominerAnimationTemplate,
    },
  },
  {
    name: "round_robot",
    assembly: {
      kind: "skeleton",
      animationTemplate: roundRobotAnimationTemplate,
    },
  },
  {
    name: "silver_round_robot",
    assembly: {
      kind: "skeleton",
      animationTemplate: roundRobotAnimationTemplate,
    },
  },
  {
    name: "robot",
    assembly: {
      kind: "skeleton",
      animationTemplate: robotAnimationTemplate,
    },
  },
  {
    name: "helping_robot",
    assembly: {
      kind: "skeleton",
      animationTemplate: helpingRobotAnimationTemplate,
    },
  },
  {
    name: "mucked_robot",
    assembly: {
      kind: "skeleton",
      animationTemplate: helpingRobotAnimationTemplate,
    },
  },
];

function voxPathFromNpcName(name: string) {
  return `npcs/${name}_mesh.vox`;
}

function animatedGltfFromNpcEntry(x: NpcEntry): l.GeneralNode<"GLTF" | "GLB"> {
  switch (x.assembly.kind) {
    case "skeleton":
      return animatedNpcGltf(
        voxForNpc(x),
        x.assembly.animationTemplate.animationFile ??
          `npcs/${x.name}_animations.gltf`,
        x.assembly.animationTemplate
      );
      break;
    case "player":
      return animatedcharacterMeshFromWearables(x.assembly.wearableParams);
  }
}

function npcToItemMesh(x: NpcEntry): l.GeneralNode<"GLTFItemMesh"> | undefined {
  if (x.assembly.kind !== "skeleton") {
    return undefined;
  }

  const vox = voxForNpc(x);
  const centerOfMassTranslation = l.AffineFromTranslation(l.GetAABBCenter(vox));
  const itemTransform = l.AffineFromList([
    l.AffineFromAxisRotation([1, 0, 0], -90),
    centerOfMassTranslation,
  ]);

  return l.ToItemMesh(
    l.ToGLB(l.TransformGLTF(l.ToGLTF(vox), itemTransform)),
    l.AffineFromList([])
  );
}

export const animatedGltfEntries: [string, l.GeneralNode<"GLTF" | "GLB">][] =
  npcsList.map((x) => [x.name, animatedGltfFromNpcEntry(x)]);

export function getAssets(): Record<string, l.Asset> {
  return {
    ...Object.fromEntries(
      animatedGltfEntries.map(([n, a]) => [`npcs/${n}`, a])
    ),
    ...Object.fromEntries(
      npcsList.flatMap((x) => {
        const maybeItemMesh = npcToItemMesh(x);
        if (!maybeItemMesh) {
          return [];
        }
        return [[`item_meshes/npcs/${x.name}`, maybeItemMesh]];
      })
    ),
  };
}

/* eslint-disable unused-imports/no-unused-vars */
import { getOwnedItems } from "@/client/components/inventory/helpers";
import type { NUXStateMachineDefinition } from "@/client/game/context_managers/nux_manager";
import {
  shortCircuitForStepComplete,
  timedNUXState,
  unlockWithChallengeStepStart,
} from "@/client/util/nux/helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import { Wearing } from "@/shared/ecs/gen/components";
import { isFloraId } from "@/shared/game/ids";
import { matchingItemRefs } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import { dist } from "@/shared/math/linear";
import type { Vec2 } from "@/shared/math/types";

export enum NUXES {
  MOVEMENT = 1,
  INTRO_QUESTS = 100,
  BREAK_BLOCKS = 101,
  PLACE_BLOCKS = 102,
  WEAR_STUFF = 103,
  RUN_AND_JUMP = 104,
  ENTER_WATER = 9,
  SELFIE_PHOTO = 105,
  HANDCRAFT_BUSTER = 107,
}

export enum NUX_PAIRED_STEPS {
  ROAD_AHEAD_MEET_UP_WITH_BILLY = 166072605041642,
  ROAD_AHEAD_COLLECT_MUCKWAD = 3623277001113501,
  ROAD_AHEAD_PLACE_BLOCKS = 5660250530071909,
  ROAD_AHEAD_WEAR = 4273096364377975,
  ROAD_AHEAD_FIND_BAG = 7786806792035454,
  ROAD_AHEAD_SELFIE = 8903834562824062,
  BUSTED_WOODEN_AXE = 4478447552347541,
  BUSTED_MUCK_BUSTERS = 6113676978673631,
}

export const JACKIE_ID = 8997551883502307 as BiomesId;

export const GENESIS_CROSSROADS_LOCATION: Vec2 = [425, -96];
export const LOVELY_LOCKS_LOCATION: Vec2 = [778, 200];
export const MOSSLAWN_LOCATION: Vec2 = [730, -107];
export const SHUTTER_COVE_LOCATION: Vec2 = [299, -495];

export type AllNUXStates = {
  [NUXES.MOVEMENT]:
    | "movement_start"
    | "movement_wasd"
    | "movement_jump"
    | "movement_run"
    | "movement_talk_to_jackie"
    | "movement_near_jackie";

  [NUXES.INTRO_QUESTS]:
    | "intro_quests_start"
    | "intro_quests_tracked"
    | "intro_quests_press_q";

  [NUXES.BREAK_BLOCKS]: "break_blocks_start" | "break_blocks_break";
  [NUXES.PLACE_BLOCKS]:
    | "place_blocks_start"
    | "place_blocks_place"
    | "place_blocks_select";

  [NUXES.WEAR_STUFF]:
    | "wear_stuff_start"
    | "wear_stuff_prompt_inventory"
    | "wear_stuff_wear_items";

  [NUXES.RUN_AND_JUMP]: "run_and_jump_start" | "run_and_jump_run";
  [NUXES.ENTER_WATER]:
    | "enter_water_start"
    | "enter_water_first_time"
    | "enter_water_waiting_second"
    | "enter_water_second_time";

  [NUXES.SELFIE_PHOTO]:
    | "selfie_photo_start"
    | "selfie_camera_equip"
    | "selfie_camera_prompt"
    | "selfie_camera_click"
    | "selfie_camera_post";

  [NUXES.HANDCRAFT_BUSTER]:
    | "handcraft_buster_start"
    | "handcraft_buster_prompt"
    | "handcraft_buster_crafting";
};

export type NUXStates<T extends keyof AllNUXStates> = AllNUXStates[T];

const movementNUX: NUXStateMachineDefinition<NUXStates<NUXES.MOVEMENT>> = {
  id: NUXES.MOVEMENT,
  startState: "movement_start",
  debugState: "movement_wasd",
  states: {
    movement_start: {
      subscribedEvents: ["player_init", "wake_up_complete"],
      advance: () => {
        return {
          id: "movement_wasd",
        };
      },
    },
    movement_wasd: {
      subscribedEvents: ["move"],
      advance: () => ({ id: "movement_jump" }),
    },

    movement_jump: {
      subscribedEvents: ["jump", "talk_npc"],
      advance: (_ctx, _data, event) => {
        if (event.kind === "talk_npc" && event.npcId === JACKIE_ID) {
          return "complete";
        }

        return { id: "movement_run" };
      },
    },

    movement_run: {
      subscribedEvents: ["talk_npc", "move"],
      advance: (ctx, _data, event) => {
        if (event.kind === "talk_npc" && event.npcId === JACKIE_ID) {
          return "complete";
        }

        if (event.kind === "move" && event.running) {
          /* Skip talk to jackie if in minigame */
          if (
            ctx.resources.get("/ecs/c/playing_minigame", ctx.userId)
              ?.minigame_id
          ) {
            return "complete";
          }
          return {
            id: "movement_talk_to_jackie",
          };
        }
      },
    },

    movement_talk_to_jackie: {
      subscribedEvents: ["talk_npc", "move"],
      advance: (ctx, _data, event) => {
        if (
          (event.kind === "talk_npc" && event.npcId === JACKIE_ID) ||
          ctx.resources.get("/ecs/c/playing_minigame", ctx.userId)
            ?.minigame_id /* Skip talk to jackie if in minigame */
        ) {
          return "complete";
        }

        if (event.kind === "move") {
          const jackie = ctx.resources.get("/ecs/c/position", JACKIE_ID);
          const me = ctx.resources.get("/scene/local_player");
          if (jackie && dist(jackie.v, me.player.position) < 5) {
            return {
              id: "movement_near_jackie",
            };
          }
        }
      },
    },

    movement_near_jackie: {
      subscribedEvents: ["talk_npc", "move"],
      advance: (ctx, _data, event) => {
        if (event.kind === "talk_npc" && event.npcId === JACKIE_ID) {
          return "complete";
        }

        if (event.kind === "move") {
          const jackie = ctx.resources.get("/ecs/c/position", JACKIE_ID);
          const me = ctx.resources.get("/scene/local_player");
          if (jackie && dist(jackie.v, me.player.position) >= 5) {
            return {
              id: "movement_talk_to_jackie",
            };
          }
        }
      },
    },
  },
};

const introQuestsNux: NUXStateMachineDefinition<NUXStates<NUXES.INTRO_QUESTS>> =
  {
    id: NUXES.INTRO_QUESTS,
    startState: "intro_quests_start",
    debugState: "intro_quests_tracked",
    states: {
      intro_quests_start: unlockWithChallengeStepStart<
        NUXStates<NUXES.INTRO_QUESTS>
      >(NUX_PAIRED_STEPS.ROAD_AHEAD_MEET_UP_WITH_BILLY as BiomesId, {
        id: "intro_quests_tracked",
      }),

      intro_quests_tracked: timedNUXState(NUXES.INTRO_QUESTS, {
        id: "intro_quests_press_q",
      }),

      intro_quests_press_q: {
        subscribedEvents: ["open_tab", "challenge_step_complete"],
        advance: shortCircuitForStepComplete(
          NUX_PAIRED_STEPS.ROAD_AHEAD_MEET_UP_WITH_BILLY as BiomesId,
          (_ctx, _data, event) => {
            if (event.kind === "open_tab" && event.tab === "map") {
              return "complete";
            }
          }
        ),
      },
    },
  };

const breakBlocksNux: NUXStateMachineDefinition<NUXStates<NUXES.BREAK_BLOCKS>> =
  {
    id: NUXES.BREAK_BLOCKS,
    startState: "break_blocks_start",
    debugState: "break_blocks_break",
    states: {
      break_blocks_start: unlockWithChallengeStepStart<
        NUXStates<NUXES.BREAK_BLOCKS>
      >(NUX_PAIRED_STEPS.ROAD_AHEAD_COLLECT_MUCKWAD as BiomesId, {
        id: "break_blocks_break",
      }),

      break_blocks_break: {
        subscribedEvents: ["destroy", "challenge_step_complete"],
        advance: shortCircuitForStepComplete(
          NUX_PAIRED_STEPS.ROAD_AHEAD_COLLECT_MUCKWAD as BiomesId,
          (_ctx, _data, event) => {
            if (
              event.kind === "destroy" &&
              event.terrainId &&
              !isFloraId(event.terrainId)
            ) {
              return "complete";
            }
          }
        ),
      },
    },
  };

const placeBlocksNux: NUXStateMachineDefinition<NUXStates<NUXES.PLACE_BLOCKS>> =
  {
    id: NUXES.PLACE_BLOCKS,
    startState: "place_blocks_start",
    debugState: "place_blocks_place",
    states: {
      place_blocks_start: {
        subscribedEvents: ["challenge_step_begin"],
        advance: (ctx, _data, event) => {
          if (
            event.kind === "challenge_step_begin" &&
            event.stepId === NUX_PAIRED_STEPS.ROAD_AHEAD_PLACE_BLOCKS
          ) {
            const playerInventory = ctx.resources.get(
              "/ecs/c/inventory",
              ctx.userId
            );
            const selection = ctx.resources.get("/hotbar/selection");

            if (selection.item && selection.item.isBlock) {
              return {
                id: "place_blocks_place",
              };
            }

            const placeableIdx = playerInventory?.hotbar.findIndex(
              (e) => e && e.item.isBlock
            );
            if (placeableIdx !== undefined && placeableIdx >= 0) {
              return {
                id: "place_blocks_select",
              };
            }
          }
        },
      },

      place_blocks_select: {
        subscribedEvents: ["selection_change", "challenge_step_complete"],
        advance: shortCircuitForStepComplete(
          NUX_PAIRED_STEPS.ROAD_AHEAD_PLACE_BLOCKS as BiomesId,
          (ctx, _data, event) => {
            if (event.kind === "selection_change") {
              const selection = ctx.resources.get("/hotbar/selection");
              if (selection?.item && selection.item.isBlock) {
                return {
                  id: "place_blocks_place",
                };
              }
            }
          }
        ),
      },

      place_blocks_place: {
        subscribedEvents: [
          "selection_change",
          "place_voxel",
          "challenge_step_complete",
        ],
        advance: shortCircuitForStepComplete(
          NUX_PAIRED_STEPS.ROAD_AHEAD_PLACE_BLOCKS as BiomesId,
          (ctx, _data, event) => {
            if (event.kind === "selection_change") {
              const selection = ctx.resources.get("/hotbar/selection");
              if (!selection?.item || !selection.item.isBlock) {
                return {
                  id: "place_blocks_select",
                };
              }
            }
          }
        ),
      },
    },
  };

const wearStuff: NUXStateMachineDefinition<NUXStates<NUXES.WEAR_STUFF>> = {
  id: NUXES.WEAR_STUFF,
  startState: "wear_stuff_start",
  debugState: "wear_stuff_prompt_inventory",
  states: {
    wear_stuff_start: unlockWithChallengeStepStart<NUXStates<NUXES.WEAR_STUFF>>(
      NUX_PAIRED_STEPS.ROAD_AHEAD_WEAR as BiomesId,
      {
        id: "wear_stuff_prompt_inventory",
      }
    ),

    wear_stuff_wear_items: {
      subscribedEvents: [
        "close_tab",
        "inventory_change",
        "bootstrap",
        "challenge_step_complete",
      ],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_WEAR as BiomesId,
        (ctx, _data, event) => {
          const wearing =
            ctx.resources.get("/ecs/c/wearing", ctx.userId) ?? Wearing.create();
          if (event.kind === "close_tab" || event.kind === "bootstrap") {
            return { id: "wear_stuff_prompt_inventory" };
          } else if (
            event.kind === "inventory_change" &&
            wearing.items.get(BikkieIds.top) &&
            wearing.items.get(BikkieIds.bottoms)
          ) {
            return "complete";
          }
        }
      ),
    },

    wear_stuff_prompt_inventory: {
      subscribedEvents: ["open_tab", "challenge_step_complete"],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_WEAR as BiomesId,
        (_ctx, _data, event) => {
          if (event.kind === "open_tab" && event.tab === "inventory") {
            return { id: "wear_stuff_wear_items" };
          }
        }
      ),
    },
  },
};

const runAndJumpNux: NUXStateMachineDefinition<NUXStates<NUXES.RUN_AND_JUMP>> =
  {
    id: NUXES.RUN_AND_JUMP,
    startState: "run_and_jump_start",
    debugState: "run_and_jump_run",
    states: {
      run_and_jump_start: unlockWithChallengeStepStart<
        NUXStates<NUXES.RUN_AND_JUMP>
      >(NUX_PAIRED_STEPS.ROAD_AHEAD_FIND_BAG as BiomesId, {
        id: "run_and_jump_run",
      }),

      run_and_jump_run: {
        subscribedEvents: ["jump"],
        advance: (_ctx, _data, event) => {
          if (event.kind === "jump" && event.running) {
            return "complete";
          }
        },
      },
    },
  };

const enterWaterNux: NUXStateMachineDefinition<NUXStates<NUXES.ENTER_WATER>> = {
  id: NUXES.ENTER_WATER,
  startState: "enter_water_start",
  debugState: "enter_water_first_time",
  states: {
    enter_water_start: {
      subscribedEvents: ["enter_water"],
      advance: () => ({ id: "enter_water_first_time" }),
    },
    enter_water_first_time: timedNUXState(NUXES.ENTER_WATER, {
      id: "enter_water_waiting_second",
    }),
    enter_water_waiting_second: {
      subscribedEvents: ["enter_water"],
      advance: (_ctx, data, event) => {
        // TODO: This throttling should also take affect across refreshes.
        if (performance.now() - data.localStartTime > 2 * 60 * 1000) {
          return { id: "enter_water_second_time" };
        }
      },
    },
    enter_water_second_time: timedNUXState(NUXES.ENTER_WATER, "complete"),
  },
};

const takeSelfie: NUXStateMachineDefinition<NUXStates<NUXES.SELFIE_PHOTO>> = {
  id: NUXES.SELFIE_PHOTO,
  startState: "selfie_photo_start",
  debugState: "selfie_camera_equip",
  states: {
    selfie_photo_start: unlockWithChallengeStepStart<
      NUXStates<NUXES.SELFIE_PHOTO>
    >(NUX_PAIRED_STEPS.ROAD_AHEAD_SELFIE as BiomesId, {
      id: "selfie_camera_equip",
    }),
    selfie_camera_equip: {
      subscribedEvents: [
        "selection_change",
        "local_inventory_selection_change",
        "challenge_complete",
      ],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_SELFIE as BiomesId,
        (ctx, _data, event) => {
          const selection = ctx.resources.get("/hotbar/selection");
          if (
            event.kind === "selection_change" &&
            selection.kind === "camera"
          ) {
            return {
              id: "selfie_camera_prompt",
            };
          }
        }
      ),
    },

    selfie_camera_prompt: {
      subscribedEvents: ["selection_change", "challenge_step_complete"],

      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_SELFIE as BiomesId,
        (ctx, _data, event) => {
          const selection = ctx.resources.get("/hotbar/selection");
          if (event.kind === "selection_change") {
            if (
              selection.kind === "camera" &&
              selection.mode.kind === "selfie"
            ) {
              return { id: "selfie_camera_click" };
            } else if (selection.kind !== "camera") {
              return {
                id: "selfie_camera_equip",
              };
            }
          }
        }
      ),
    },

    selfie_camera_click: {
      subscribedEvents: [
        "selection_change",
        "show_post_capture",
        "photo_post_attempt",
        "challenge_step_complete",
      ],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_SELFIE as BiomesId,
        (ctx, data, event) => {
          const selection = ctx.resources.get("/hotbar/selection");
          if (event.kind === "selection_change") {
            if (selection.kind !== "camera") {
              return { id: "selfie_camera_prompt" };
            }
            if (selection.mode.kind !== "selfie") {
              return { id: "selfie_camera_prompt" };
            }
          }

          if (event.kind === "photo_post_attempt") {
            return "complete";
          }
          if (event.kind === "show_post_capture") {
            return { id: "selfie_camera_post" };
          }
        }
      ),
    },

    selfie_camera_post: {
      subscribedEvents: [
        "selection_change",
        "show_post_capture",
        "hide_post_capture",
        "bootstrap",
        "photo_post_attempt",
        "challenge_step_complete",
      ],

      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.ROAD_AHEAD_SELFIE as BiomesId,
        (ctx, data, event) => {
          if (event.kind === "photo_post_attempt") {
            return "complete";
          } else if (event.kind === "hide_post_capture") {
            return {
              id: "selfie_camera_click",
            };
          } else if (
            event.kind === "selection_change" ||
            event.kind === "bootstrap"
          ) {
            return { id: "selfie_camera_equip" };
          }
        }
      ),
    },
  },
};

const handcraftMuckBuster: NUXStateMachineDefinition<
  NUXStates<NUXES.HANDCRAFT_BUSTER>
> = {
  id: NUXES.HANDCRAFT_BUSTER,
  startState: "handcraft_buster_start",
  debugState: "handcraft_buster_prompt",
  states: {
    handcraft_buster_start: unlockWithChallengeStepStart<
      NUXStates<NUXES.HANDCRAFT_BUSTER>
    >(NUX_PAIRED_STEPS.BUSTED_MUCK_BUSTERS as BiomesId, {
      id: "handcraft_buster_prompt",
    }),
    handcraft_buster_prompt: {
      subscribedEvents: ["open_tab", "challenge_step_complete"],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.BUSTED_MUCK_BUSTERS as BiomesId,
        (_ctx, _data, event) => {
          if (event.kind === "open_tab" && event.tab === "crafting") {
            return { id: "handcraft_buster_crafting" };
          }

          if (
            event.kind === "challenge_step_complete" &&
            event.stepId === NUX_PAIRED_STEPS.BUSTED_MUCK_BUSTERS
          ) {
            return "complete";
          }
        }
      ),
    },

    handcraft_buster_crafting: {
      subscribedEvents: [
        "close_tab",
        "inventory_change",
        "bootstrap",
        "challenge_step_complete",
      ],
      advance: shortCircuitForStepComplete(
        NUX_PAIRED_STEPS.BUSTED_MUCK_BUSTERS as BiomesId,
        (ctx, data, event) => {
          if (event.kind === "inventory_change") {
            const ownedItems = getOwnedItems(ctx.resources, ctx.userId);
            const hasBuster =
              matchingItemRefs(ownedItems, (e) => Boolean(e?.item.unmuck))
                .length > 0;
            if (hasBuster) {
              return "complete";
            }
          }

          if (event.kind === "close_tab" || event.kind === "bootstrap") {
            return { id: "handcraft_buster_prompt" };
          }

          if (
            event.kind === "challenge_step_complete" &&
            event.stepId === NUX_PAIRED_STEPS.BUSTED_MUCK_BUSTERS
          ) {
            return "complete";
          }
        }
      ),
    },
  },
};

export const ALL_NUXES = [
  movementNUX,
  introQuestsNux,
  breakBlocksNux,
  placeBlocksNux,
  wearStuff,
  runAndJumpNux,
  enterWaterNux,
  takeSelfie,
  handcraftMuckBuster,
];

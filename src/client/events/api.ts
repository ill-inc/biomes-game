import type { TriggerProgress } from "@/client/game/resources/challenges";
import type { TabbedPauseTabKind } from "@/client/game/resources/game_modal";
import type { NUXES } from "@/client/util/nux/state_machines";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import type { Envelope } from "@/shared/chat/types";
import type {
  Item,
  ReadonlyOptionalDamageSource,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type { AABB, ReadonlyVec2 } from "@/shared/math/types";
import EventEmitter from "events";

export type GardenHoseEvent =
  | {
      kind:
        | "bootstrap"
        | "player_init"
        | "inventory_change"
        | "local_inventory_selection_change"
        | "selection_change"
        | "place_voxel"
        | "open_shop"
        | "close_shop"
        | "open_pause"
        | "inventory_overflow_item_received"
        | "inventory_overflow_opened"
        | "enter_water"
        | "enter_cave"
        | "close_pause"
        | "display_pdp"
        | "hide_pdp"
        | "click_photo_message"
        | "photo_post_attempt"
        | "photo_post"
        | "photo_post_error"
        | "inspect_frame"
        | "wake_up_complete"
        | "warp_post"
        | "warp_group";
    }
  | {
      kind: "move" | "jump";
      running: boolean;
    }
  | {
      kind: "destroy";
      terrainId?: TerrainID;
    }
  | {
      kind: "challenge_unlock" | "challenge_complete" | "challenge_abandon";
      id: BiomesId;
    }
  | {
      kind: "challenge_step_begin";
      stepId: BiomesId;
      triggerProgress: TriggerProgress;
    }
  | {
      kind: "challenge_step_complete";
      stepId: BiomesId;
      triggerProgress: TriggerProgress;
    }
  | {
      kind: "challenge_step_progress";
      triggerProgress: TriggerProgress;
      stepId: BiomesId;
      previousProgress: number | undefined;
      progress: number;
    }
  | {
      kind: "flag_complete";
      id: BiomesId;
    }
  | {
      kind: "equip";
      hotbarIndex: number;
    }
  | {
      kind: "nux_complete";
      id: number;
    }
  | {
      kind: "place_placeable";
      item: Item;
    }
  | {
      kind: "open_tab";
      tab: TabbedPauseTabKind;
    }
  | {
      kind: "close_tab";
      tab: TabbedPauseTabKind;
    }
  | {
      kind: "show_post_capture";
    }
  | {
      kind: "hide_post_capture";
    }
  | {
      kind: "warped";
    }
  | {
      kind: "take_damage";
      damageSource: ReadonlyOptionalDamageSource;
    }
  | {
      kind: "die";
      damageSource: ReadonlyOptionalDamageSource;
    }
  | {
      kind: "beam_dismiss";
      beamType: "player" | "ecs" | "navigation";
      beamLocation: ReadonlyVec2;
    }
  | {
      kind: "talk_npc";
      npcId: BiomesId;
    }
  | {
      kind: "nux_advance";
      nuxId: NUXES;
    }
  | {
      kind: "open_station";
      stationItem: Item;
      stationEntityId: BiomesId;
    }
  | {
      kind: "minigame_simple_race_finish";
      minigameId: BiomesId;
      minigameInstanceId: BiomesId;
    }
  | {
      kind: "minigame_simple_race_quit";
    }
  | {
      kind: "minigame_quit";
      minigameId: BiomesId;
      minigameInstanceId: BiomesId;
    }
  | {
      kind: "start_collide_placeable";
      placeableId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "stop_collide_placeable";
      placeableId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "start_collide_entity";
      entityId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "stop_collide_entity";
      entityId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "start_ground_collide_entity";
      entityId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "stop_ground_collide_entity";
      entityId: BiomesId;
      playerId: BiomesId;
    }
  | {
      kind: "enter_robot_field";
      robotId: BiomesId | undefined;
    }
  | {
      kind: "blueprint_complete";
      entityId: BiomesId;
      aabb: AABB;
    }
  | {
      kind: "boost_placement";
      entityId: BiomesId;
    }
  | {
      kind: "mail_received";
      mail: Envelope[];
      initialBootstrap: boolean;
    };

export type GardenHoseEventKind = GardenHoseEvent["kind"] | "anyEvent";
export type GardenHoseEventOfKind<K extends GardenHoseEventKind> =
  K extends "anyEvent"
    ? GardenHoseEvent
    : Extract<GardenHoseEvent, { kind: K }>;

export type GardenHoseEventMap = {
  [EV in GardenHoseEvent as EV["kind"]]: (event: EV) => void;
};

// This class is a central source for all logical 'events' on the client
// (e.g. movement, entering water, etc.)
export class GardenHose {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  on<K extends GardenHoseEventKind>(
    event: K,
    listener: (event: GardenHoseEventOfKind<K>) => unknown
  ) {
    this.emitter.on(event, listener);
  }

  off<K extends GardenHoseEventKind>(
    event: K,
    listener: (event: GardenHoseEventOfKind<K>) => unknown
  ) {
    this.emitter.off(event, listener);
  }

  publish(event: GardenHoseEvent) {
    this.emitter.emit(event["kind"], event as any);
    this.emitter.emit("anyEvent", event);
  }
}

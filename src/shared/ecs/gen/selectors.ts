// GENERATED: This file is generated from selectors.ts.j2. Do not modify directly.
// Content Hash: 3b163aaef5b8569f8015dfab554facf6

import { createComponentSelector } from "@/shared/ecs/selectors/helper";

// ====================
// Selector definitions
// ====================

export const PositionSelector = createComponentSelector(
  "position_selector",
  "position"
);
export const LabelSelector = createComponentSelector("label_selector", "label");
export const GrabBagSpatialSelector = createComponentSelector(
  "grab_bag_spatial_selector",
  "grab_bag",
  "position"
);
export const DropSelector = createComponentSelector(
  "drop_selector",
  "loose_item",
  "position"
);
export const NpcSelector = createComponentSelector(
  "npc_selector",
  "npc_metadata",
  "npc_state",
  "orientation",
  "position",
  "rigid_body",
  "size",
  "health"
);
export const NpcMetadataSelector = createComponentSelector(
  "npc_metadata_selector",
  "npc_metadata",
  "position",
  "size"
);
export const LightSourceSelector = createComponentSelector(
  "light_source_selector",
  "position",
  "locked_in_place",
  "irradiance"
);
export const UnmuckSourceSelector = createComponentSelector(
  "unmuck_source_selector",
  "position",
  "locked_in_place",
  "unmuck"
);
export const AudioSourceSelector = createComponentSelector(
  "audio_source_selector",
  "position",
  "placeable_component",
  "video_component"
);
export const TerrainShardSelector = createComponentSelector(
  "terrain_shard_selector",
  "box",
  "shard_seed",
  "shard_diff",
  "shard_shapes"
);
export const WaterShardSelector = createComponentSelector(
  "water_shard_selector",
  "box",
  "shard_water"
);
export const PlaceableSelector = createComponentSelector(
  "placeable_selector",
  "position",
  "orientation",
  "placeable_component"
);
export const BlueprintSelector = createComponentSelector(
  "blueprint_selector",
  "position",
  "orientation",
  "blueprint_component"
);
export const CanPickUpSelector = createComponentSelector(
  "can_pick_up_selector",
  "inventory",
  "wearing",
  "position",
  "selected_item"
);
export const PlayerSelector = createComponentSelector(
  "player_selector",
  "remote_connection",
  "position",
  "label"
);
export const ActivePlayersSelector = createComponentSelector(
  "active_players_selector",
  "remote_connection",
  "position",
  "label"
);
export const EnvironmentGroupSelector = createComponentSelector(
  "environment_group_selector",
  "box",
  "group_component",
  "label"
);
export const GroupPreviewSelector = createComponentSelector(
  "group_preview_selector",
  "box",
  "group_component",
  "group_preview_component"
);
export const ReadyMinigameSelector = createComponentSelector(
  "ready_minigame_selector",
  "minigame_component"
);
export const MinigameElementByMinigameIdSelector = createComponentSelector(
  "minigame_element_by_minigame_id_selector",
  "minigame_element"
);
export const MinigameElementsSelector = createComponentSelector(
  "minigame_elements_selector",
  "minigame_element"
);
export const MinigameInstancesByMinigameIdSelector = createComponentSelector(
  "minigame_instances_by_minigame_id_selector",
  "minigame_instance"
);
export const PresetByLabelSelector = createComponentSelector(
  "preset_by_label_selector",
  "preset_prototype",
  "label"
);
export const GremlinSelector = createComponentSelector(
  "gremlin_selector",
  "gremlin"
);
export const FarmingPlantSelector = createComponentSelector(
  "farming_plant_selector",
  "position",
  "farming_plant_component"
);
export const NamedQuestGiverSelector = createComponentSelector(
  "named_quest_giver_selector",
  "label",
  "quest_giver"
);
export const UnmuckSelector = createComponentSelector(
  "unmuck_selector",
  "position",
  "unmuck"
);
export const RobotSelector = createComponentSelector(
  "robot_selector",
  "position",
  "robot_component"
);
export const RobotsByCreatorIdSelector = createComponentSelector(
  "robots_by_creator_id_selector",
  "position",
  "robot_component"
);
export const RobotsByLandmarkNameSelector = createComponentSelector(
  "robots_by_landmark_name_selector",
  "position",
  "robot_component"
);
export const RobotsThatClearSelector = createComponentSelector(
  "robots_that_clear_selector",
  "position",
  "unmuck",
  "robot_component"
);
export const MinigamesByCreatorIdSelector = createComponentSelector(
  "minigames_by_creator_id_selector",
  "minigame_component"
);
export const CollideableSelector = createComponentSelector(
  "collideable_selector",
  "collideable",
  "position"
);
export const PlaceablesByCreatorIdSelector = createComponentSelector(
  "placeables_by_creator_id_selector",
  "placeable_component",
  "created_by"
);
export const ProtectionByTeamIdSelector = createComponentSelector(
  "protection_by_team_id_selector",
  "position",
  "size",
  "protection",
  "acl_component"
);
export const RestoredPlaceableSelector = createComponentSelector(
  "restored_placeable_selector",
  "placeable_component",
  "restores_to"
);
export const PlaceablesByItemIdSelector = createComponentSelector(
  "placeables_by_item_id_selector",
  "placeable_component"
);

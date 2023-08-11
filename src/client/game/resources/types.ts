import type { CanvasEffect } from "@/client/components/canvas_effects";
import type { PreviewSlot } from "@/client/components/character/CharacterPreview";
import type { IngameAdminPages } from "@/client/components/InGameAdminPanel";
import type { ToastMessage } from "@/client/components/toast/types";
import type { ServerTime } from "@/client/game/context_managers/client_io";
import type { NavigationAidKind } from "@/client/game/helpers/navigation_aids";
import type {
  PostprocessingPipeline,
  PostprocessName,
} from "@/client/game/renderers/passes/composer";
import type { SpatialLighting } from "@/client/game/renderers/util";
import type { AudioResource } from "@/client/game/resources/audio";
import type { TransientBeams } from "@/client/game/resources/beams";
import type { BlockMesh, BlockTextures } from "@/client/game/resources/blocks";
import type {
  BlueprintMeshData,
  BlueprintResource,
} from "@/client/game/resources/blueprints";
import type {
  Camera,
  CameraEffects,
  CameraEnvironment,
  WaypointCameraActive,
  WaypointCameraTrack,
} from "@/client/game/resources/camera";
import type {
  ChallengeStateIndex,
  QuestBundle,
  TriggerProgress,
  TriggerProgressKindPayload,
  TriggerStateIndex,
  TriggerStateStepIndex,
} from "@/client/game/resources/challenges";
import type {
  ChatMessages,
  ProgressMessages,
} from "@/client/game/resources/chat";
import type { Cursor } from "@/client/game/resources/cursor";
import type { DropResource } from "@/client/game/resources/drops";
import type { FloraColors, FloraMesh } from "@/client/game/resources/florae";
import type { ForbiddenEdits } from "@/client/game/resources/forbidden_edits";
import type {
  GameModal,
  GameModalActiveTab,
} from "@/client/game/resources/game_modal";
import type {
  ServerJsResource,
  SocketStatusResource,
} from "@/client/game/resources/game_status";
import type { GlassMesh, GlassTextures } from "@/client/game/resources/glass";
import type {
  ComputedGraphicsSettings,
  DynamicGraphicsSettings,
  LiteralGraphicsSettings,
  ResolvedGraphicsSettings,
} from "@/client/game/resources/graphics_settings";
import type {
  GroupPlacementMesh,
  GroupPlacementPreview,
  GroupPlacementTensor,
} from "@/client/game/resources/group_placement";
import type {
  GroupData,
  GroupHighlightState,
  GroupMesh,
  GroupPreview,
  GroupRefinement,
  GroupSource,
} from "@/client/game/resources/groups";
import type { HotBarSelection } from "@/client/game/resources/inventory";
import type {
  ItemMeshFactory,
  ItemMeshKey,
} from "@/client/game/resources/item_mesh";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import type { RecipesState } from "@/client/game/resources/local_recipes";
import type { AnimatedMaterial } from "@/client/game/resources/materials";
import type { MeleeAttackRegion } from "@/client/game/resources/melee_attack_region";
import type { MinigameResourcePaths } from "@/client/game/resources/minigames";
import type {
  BecomeNPCState,
  NpcCommonEffects,
  NpcEffects,
  NpcRenderState,
} from "@/client/game/resources/npcs";
import type { ActiveNUX } from "@/client/game/resources/nuxes";
import type {
  ForceLocationOverlay,
  LootEvent,
  OverlayMap,
  ProjectionMap,
} from "@/client/game/resources/overlays";
import type {
  ParticleSystem,
  ParticleSystemMaterials,
} from "@/client/game/resources/particles";
import type {
  AnimatedPlaceableMesh,
  CSS3DState,
} from "@/client/game/resources/placeables/types";
import type {
  LoadedPlayerMesh,
  PlayerCommonEffects,
  PlayerPreview,
  PlayerWearingMeshGltf,
} from "@/client/game/resources/player_mesh";
import type {
  Player,
  PlayerControlModifiers,
  PlayerEnvironment,
  PlayerEnvironmentMuck,
  PlayerEnvironmentWater,
  PlayerKnockback,
  PlayerPossibleTerrainActions,
  ScenePlayer,
} from "@/client/game/resources/players";
import type {
  AddPreviewSpec,
  EditPreview,
} from "@/client/game/resources/previews";
import type {
  ProtectionBoundary,
  ProtectionMapBoundary,
  ProtectionMaterial,
  ProtectionMesh,
} from "@/client/game/resources/protection";
import type { SkyParams } from "@/client/game/resources/sky";
import type {
  CombinedMesh,
  OcclusionData,
  OcclusionDebugMesh,
} from "@/client/game/resources/terrain";
import type { WaterMesh, WaterTexture } from "@/client/game/resources/water";
import type { ReactResources } from "@/client/resources/react";
import type { AssetPath } from "@/galois/interface/asset_paths";
import type { ClientRuleSet } from "@/server/shared/minigames/ruleset/client_types";
import type { Tweaks } from "@/server/shared/minigames/ruleset/tweaks";
import type { SyncTarget } from "@/shared/api/sync";
import type {
  CameraItemMode,
  PlayerModifiersRequired,
} from "@/shared/bikkie/schema/types";
import type { ReadonlyBuffsComponent } from "@/shared/ecs/gen/components";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { ReadonlyTriggerStateMap, Vec3f } from "@/shared/ecs/gen/types";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import type { IndexedEcsResourcePaths } from "@/shared/game/ecs_indexed_resources";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import type { BlockResourcePaths } from "@/shared/game/resources/blocks";
import type { FloraResourcePaths } from "@/shared/game/resources/florae";
import type { GlassResourcePaths } from "@/shared/game/resources/glass";
import type { IsomorphismResourcePaths } from "@/shared/game/resources/isomorphisms";
import type { LightingResourcePaths } from "@/shared/game/resources/light";
import type { PhysicsResourcePaths } from "@/shared/game/resources/physics";
import type { TerrainResourcePaths } from "@/shared/game/resources/terrain";
import type { WaterResourcePaths } from "@/shared/game/resources/water";
import type { RobotParams } from "@/shared/game/robot";
import type { ShardId } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type { AABB, Mat4 } from "@/shared/math/types";
import type {
  BiomesResourcesBuilder,
  ResourcesStats,
} from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import type { MetaState } from "@/shared/triggers/base_schema";
import type { Optional, WithId } from "@/shared/util/type_helpers";
import type { AmbientOcclusionMap } from "@/shared/wasm/types/biomes";
import type {
  BoxDict,
  GroupIndex,
  ShapeIndex,
} from "@/shared/wasm/types/galois";
import type { Object3D, Texture } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export type WrappedResourcePrimitive<T> = {
  value: T;
};

interface BaseClientResourcePaths {
  // All clock times are in seconds.
  "/clock": PathDef<[], { time: number }>;
  // Time according
  "/scene/clock": PathDef<[], { time: number }>;
  "/sim/clock": PathDef<
    [],
    {
      // The render time stamp (e.g. "/render_clock") when the simulation was
      // last updated.
      lastUpdateRenderTime: number;
    }
  >;

  "/focus": PathDef<[], { focused: boolean }>;
  "/server/socket": PathDef<[], SocketStatusResource>;
  "/server/time": PathDef<[], ServerTime>;
  "/server/js": PathDef<[], ServerJsResource>;
  "/server/sync_target": PathDef<[], SyncTarget>;
  "/game_modal": PathDef<[], GameModal>;
  "/game_modal/active_tab": PathDef<[], GameModalActiveTab>;

  "/admin/current_biscuit": PathDef<[], { id: BiomesId }>;
  "/admin/current_entity": PathDef<[], { entity?: ReadonlyEntity }>;
  "/admin/inline_admin_visible": PathDef<
    [],
    { tab: IngameAdminPages | undefined }
  >;

  "/canvas_effects/hide_chrome": PathDef<
    [],
    {
      value: boolean;
      disableAnimation?: boolean;
    }
  >;
  "/canvas_effect": PathDef<[], WithId<CanvasEffect, string>>;

  "/nuxes/state_active": PathDef<[], WrappedResourcePrimitive<ActiveNUX[]>>;

  // Camera-related resources
  // TODO: Move all camera resources to be under "/camera/..."
  "/camera/environment": PathDef<[], CameraEnvironment>;

  // Chat
  "/chat": PathDef<[], ChatMessages>;
  "/dms": PathDef<[], ChatMessages>;
  "/activity": PathDef<[], ChatMessages>;
  "/activity/unread": PathDef<[], ChatMessages>;
  "/activity/popup": PathDef<[], ChatMessages>;
  "/activity/progress": PathDef<[], ProgressMessages>;

  // Group resources
  "/groups/data": PathDef<[BiomesId], Optional<GroupData>>;
  "/groups/mesh": PathDef<[BiomesId], Promise<Optional<GroupMesh>>>;
  "/groups/highlight_mesh": PathDef<[BiomesId], Optional<GroupPreview>>;
  "/groups/boxes_mesh": PathDef<[BiomesId], Optional<THREE.LineSegments>>;
  "/groups/destruction_mesh": PathDef<[BiomesId], Promise<Optional<GroupMesh>>>;
  "/groups/src": PathDef<[], GroupSource>;
  "/groups/src/data": PathDef<[], Optional<GroupData>>;
  "/groups/src/mesh": PathDef<[], Promise<Optional<GroupMesh>>>;
  "/groups/src/gltf": PathDef<[], Promise<string>>;
  "/groups/src/highlight_mesh": PathDef<[], Optional<GroupPreview>>;
  "/groups/src/refinement": PathDef<[], GroupRefinement>;

  // "You are the group" placement
  "/groups/placement/tensor": PathDef<[], GroupPlacementTensor>;
  "/groups/placement/mesh": PathDef<[], Promise<Optional<GroupPlacementMesh>>>;
  "/groups/placement/error_mesh": PathDef<
    [],
    Promise<Optional<GroupPlacementMesh>>
  >;
  "/groups/placement/error_highlight_mesh": PathDef<
    [BiomesId],
    Optional<THREE.Mesh>
  >;
  "/groups/placement/preview": PathDef<[], GroupPlacementPreview>;

  "/groups/static/data": PathDef<[], GroupData>;
  "/groups/static/mesh": PathDef<[], Promise<Optional<GroupMesh>>>;
  "/groups/index": PathDef<[], Promise<GroupIndex>>;
  "/groups/preview/data": PathDef<[BiomesId], Optional<GroupData>>;
  "/groups/preview/mesh": PathDef<[BiomesId], Promise<Optional<GroupMesh>>>;
  "/groups/blueprint/required_items": PathDef<
    [BiomesId],
    Map<BiomesId, number>
  >;
  "/groups/blueprint/has_required_items": PathDef<[BiomesId], boolean>;
  "/groups/blueprint/state": PathDef<[BiomesId], BlueprintResource>;
  "/groups/blueprint/data": PathDef<[BiomesId], Optional<GroupData>>;
  "/groups/blueprint/mesh": PathDef<
    [BiomesId],
    Promise<Optional<BlueprintMeshData>>
  >;
  "/groups/blueprint/destruction_mesh": PathDef<
    [BiomesId],
    Promise<Optional<GroupMesh>>
  >;
  "/groups/blueprint/particle_materials": PathDef<
    [BiomesId],
    Promise<ParticleSystemMaterials>
  >;
  "/groups/highlighted_groups": PathDef<[], Map<BiomesId, GroupHighlightState>>;

  // Robots
  "/robots/protection_preview_mesh": PathDef<[], Optional<THREE.Mesh>>;
  "/robots/params": PathDef<[BiomesId], Optional<RobotParams>>;
  "/robots/preview_map_boundary": PathDef<[], Optional<ProtectionMapBoundary>>;

  // Protection
  "/protection/landmark_boundary": PathDef<[string], ProtectionBoundary>;
  "/protection/creator_boundary": PathDef<[BiomesId], ProtectionBoundary>;
  "/protection/team_boundary": PathDef<[BiomesId], ProtectionBoundary>;
  "/protection/boundary": PathDef<[BiomesId], ProtectionBoundary>;
  "/protection/map_boundary": PathDef<
    [BiomesId],
    Optional<ProtectionMapBoundary>
  >;
  "/protection/material": PathDef<[], ProtectionMaterial>;
  "/protection/texture": PathDef<[], THREE.Texture>;
  "/protection/mesh": PathDef<[BiomesId], Optional<ProtectionMesh>>;

  "/hotbar/index": PathDef<[], WrappedResourcePrimitive<number>>;
  "/hotbar/camera_mode": PathDef<[], WrappedResourcePrimitive<CameraItemMode>>;
  "/hotbar/selection": PathDef<[], HotBarSelection>;

  // Caching objects
  "/challenges/state_dispatch": PathDef<[], ChallengeStateIndex>;
  "/challenges/state": PathDef<[BiomesId], QuestBundle["state"]>;
  "/challenges/trigger_state_dispatch": PathDef<[], TriggerStateIndex>;
  "/challenges/trigger_state": PathDef<
    [BiomesId],
    ReadonlyTriggerStateMap | undefined
  >;
  "/challenges/trigger_state/step_dispatch": PathDef<
    [BiomesId],
    TriggerStateStepIndex
  >;
  "/challenges/trigger_state/step": PathDef<
    [BiomesId, BiomesId],
    MetaState<any> | undefined
  >;
  "/challenges/available_or_in_progress": PathDef<[], QuestBundle[]>;
  "/challenges/active_leaves": PathDef<
    [],
    Promise<TriggerProgress<TriggerProgressKindPayload>[]>
  >;
  "/quest": PathDef<[BiomesId], QuestBundle | undefined>;
  "/local_recipes": PathDef<[], RecipesState>;

  "/materials/destroying_material": PathDef<[], Promise<AnimatedMaterial>>;
  "/materials/shaping_material": PathDef<[], Promise<AnimatedMaterial>>;
  "/overlays": PathDef<[], OverlayMap>;
  "/overlays/projection": PathDef<[], ProjectionMap>;
  "/overlays/loot": PathDef<
    [],
    { events: (LootEvent | undefined)[]; version: number }
  >;
  "/toast": PathDef<[], WrappedResourcePrimitive<Array<ToastMessage>>>;
  "/overlays/force_location": PathDef<[], ForceLocationOverlay>;

  // Player-related resources
  // TODO: Move all player resources to be under "/players/..."
  "/player/melee_attack_region_template": PathDef<[], Mat4>;
  "/player/melee_attack_region": PathDef<[BiomesId], MeleeAttackRegion>;
  "/player/preview": PathDef<[PreviewSlot], PlayerPreview>;
  "/player/applicable_buffs": PathDef<
    [],
    { buffs: ReadonlyBuffsComponent["buffs"] }
  >;
  "/player/modifiers": PathDef<[], PlayerModifiersRequired>;
  "/player/effective_acl": PathDef<
    [],
    {
      acls: Array<ReadonlyIndexedAcl>;
    }
  >;
  "/player/effective_robot": PathDef<
    [],
    WrappedResourcePrimitive<BiomesId | undefined>
  >;
  "/player/knockback": PathDef<[], PlayerKnockback>;
  "/player/control_modifiers": PathDef<[BiomesId], PlayerControlModifiers>;

  "/players/environment": PathDef<[BiomesId], PlayerEnvironment>;
  "/players/environment/muckyness": PathDef<[BiomesId], PlayerEnvironmentMuck>;
  "/players/environment/water": PathDef<[BiomesId], PlayerEnvironmentWater>;
  "/players/possible_terrain_actions": PathDef<
    [BiomesId],
    PlayerPossibleTerrainActions
  >;

  "/scene/fishing_line_points": PathDef<
    [BiomesId],
    WrappedResourcePrimitive<[Vec3f, Vec3f] | undefined>
  >;
  "/scene/fishing_line_mesh": PathDef<
    [BiomesId],
    WrappedResourcePrimitive<THREE.Object3D | undefined>
  >;

  "/scene/beams/navigation_mesh": PathDef<
    [id: number, beamType: NavigationAidKind],
    Object3D
  >;
  "/scene/beams/player_mesh": PathDef<[BiomesId], Object3D>;
  "/scene/beams/transient": PathDef<[], TransientBeams>;
  "/scene/boundary": PathDef<[], THREE.Mesh>;
  "/scene/camera": PathDef<[], Camera>;
  "/is_taking_screenshot": PathDef<
    [],
    { screenshotting: boolean; thumbnailsLoading: number }
  >;
  "/scene/camera_effects": PathDef<[], CameraEffects>;
  "/scene/cursor": PathDef<[], Cursor>;
  "/scene/drops": PathDef<[BiomesId], DropResource>;
  "/scene/item/mesh": PathDef<[ItemMeshKey], Promise<ItemMeshFactory>>;
  "/scene/local_player": PathDef<[], LocalPlayer>;
  "/scene/npc/become_npc": PathDef<[], BecomeNPCState>;
  "/scene/npc/render_state": PathDef<
    [BiomesId],
    Promise<NpcRenderState | undefined>
  >;
  "/scene/npc/spatial_lighting": PathDef<[BiomesId], SpatialLighting>;
  "/scene/npc/mesh": PathDef<[BiomesId], Promise<GLTF>>;
  "/scene/npc_type_mesh": PathDef<[BiomesId], Promise<GLTF>>;
  "/scene/npc_common_effects": PathDef<[], Promise<NpcCommonEffects>>;
  "/scene/npc_effects": PathDef<[BiomesId], Promise<NpcEffects>>;
  "/scene/placeable/mesh": PathDef<[BiomesId], Promise<AnimatedPlaceableMesh>>;
  "/scene/placeable/audio": PathDef<
    [BiomesId],
    Promise<Optional<THREE.PositionalAudio>>
  >;
  "/scene/css3d_element": PathDef<[BiomesId], CSS3DState>;

  "/scene/placeable/type_mesh": PathDef<[BiomesId], Promise<GLTF>>;
  "/scene/placeable/shop_particle_materials": PathDef<
    [],
    Promise<ParticleSystemMaterials>
  >;

  "/scene/player/animations": PathDef<[], Promise<GLTF>>;
  "/scene/player/wearing_mesh_gltf": PathDef<
    [string],
    Promise<PlayerWearingMeshGltf>
  >;
  "/scene/player/mesh_preview": PathDef<
    [PreviewSlot],
    Promise<Optional<LoadedPlayerMesh>>
  >;
  "/scene/player/mesh": PathDef<
    [BiomesId],
    Promise<Optional<LoadedPlayerMesh>>
  >;
  "/scene/player/common_effects": PathDef<[], Promise<PlayerCommonEffects>>;
  "/scene/player/buff_effects": PathDef<
    [BiomesId],
    Promise<Optional<ParticleSystemMaterials>>
  >;
  "/audio": PathDef<[], AudioResource>;
  "/audio/buffer": PathDef<[AssetPath], Promise<AudioBuffer | undefined>>;
  "/scene/particles": PathDef<[], Map<string, ParticleSystem>>;
  "/scene/player": PathDef<[BiomesId], ScenePlayer>;
  "/sim/player": PathDef<[BiomesId], Player>;

  "/space_clipboard/preview_box": PathDef<
    [],
    {
      box: AABB | undefined;
      mode: "loaded" | "unloaded";
    }
  >;
  "/space_clipboard/radius": PathDef<[], WrappedResourcePrimitive<number>>;

  "/scene/preview/space_clipboard_mesh": PathDef<[], THREE.Mesh>;
  "/scene/preview/space_clipboard": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/add_mesh": PathDef<[], THREE.Mesh>;
  "/scene/preview/add": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/add_spec": PathDef<[], AddPreviewSpec>;
  "/scene/preview/del_mesh": PathDef<[], THREE.Mesh>;
  "/scene/preview/del": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/shape": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/till": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/dye": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/water_plant": PathDef<[], Optional<EditPreview>>;
  "/scene/preview/plant": PathDef<[], Optional<EditPreview>>;
  "/scene/sky_noise": PathDef<[], THREE.Texture>;
  "/scene/sky_params": PathDef<[], SkyParams>;
  "/scene/texture/url": PathDef<[string], Promise<Texture>>;
  "/scene/waypoint_camera/track": PathDef<[], WaypointCameraTrack>;
  "/scene/waypoint_camera/active": PathDef<[], WaypointCameraActive>;
  "/scene/night_lut": PathDef<[], THREE.Data3DTexture>;

  "/scene/forbidden_edits": PathDef<[], ForbiddenEdits>;

  // Lighting resources.
  "/lighting/ambient_map": PathDef<[], AmbientOcclusionMap>;

  // Physics resources.
  "/physics/boxes": PathDef<[ShardId], Optional<BoxDict>>;

  // Terrain resources.
  "/terrain/block/mesh": PathDef<[ShardId], Promise<Optional<BlockMesh>>>;
  "/terrain/block/textures": PathDef<[], Promise<BlockTextures>>;
  "/terrain/glass/mesh": PathDef<[ShardId], Promise<Optional<GlassMesh>>>;
  "/terrain/glass/textures": PathDef<[], Promise<GlassTextures>>;
  "/terrain/boxes_mesh": PathDef<
    [ShardId],
    Promise<Optional<THREE.LineSegments>>
  >;
  "/terrain/edits_debug_mesh": PathDef<
    [ShardId],
    Promise<Optional<THREE.LineSegments>>
  >;
  "/terrain/placer_debug_mesh": PathDef<
    [ShardId],
    Promise<Optional<THREE.LineSegments>>
  >;
  "/terrain/dangling_occupancy_mesh": PathDef<
    [ShardId],
    Promise<Optional<THREE.LineSegments>>
  >;
  "/terrain/flora/colors": PathDef<[], Promise<FloraColors>>;
  "/terrain/flora/mesh": PathDef<[ShardId], Promise<Optional<FloraMesh>>>;
  "/terrain/occluder": PathDef<[ShardId], Promise<Optional<OcclusionData>>>;
  "/terrain/occluder_mesh": PathDef<[ShardId], Promise<Optional<THREE.Mesh>>>;
  "/terrain/occlusion_debug_mesh": PathDef<[], OcclusionDebugMesh>;
  "/terrain/combined_mesh": PathDef<[ShardId], Promise<Optional<CombinedMesh>>>;
  "/terrain/shape/index": PathDef<[], ShapeIndex>;
  "/terrain/shard_mesh": PathDef<[ShardId], Optional<THREE.LineSegments>>;

  // Water resources.
  "/water/debug": PathDef<[ShardId], Promise<Optional<THREE.LineSegments>>>;
  "/water/mesh": PathDef<[ShardId], Promise<Optional<WaterMesh>>>;
  "/water/texture": PathDef<[], WaterTexture>;

  // Shader resources.
  "/shaders/postprocessing": PathDef<
    [PostprocessName],
    Optional<THREE.ShaderMaterial>
  >;

  // Configs
  "/ruleset/metagame": PathDef<[], ClientRuleSet>;
  "/ruleset/current": PathDef<[], ClientRuleSet>;
  "/tweaks": PathDef<[], Tweaks>;

  "/settings/graphics/literal": PathDef<[], LiteralGraphicsSettings>;
  "/settings/graphics/resolved": PathDef<[], ResolvedGraphicsSettings>;
  "/settings/graphics/computed": PathDef<[], ComputedGraphicsSettings>;
  "/settings/graphics/dynamic": PathDef<[], DynamicGraphicsSettings>;
  "/settings/graphics/dynamic_render_scale": PathDef<
    [],
    { value: Optional<number> }
  >;
  "/settings/graphics/dynamic_draw_distance": PathDef<
    [],
    { value: Optional<number> }
  >;

  "/renderer/postprocesses": PathDef<[], PostprocessingPipeline>;

  // Muck
  "/muck/spore_particles": PathDef<
    [],
    Promise<THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>>
  >;
}

export type ClientResourcePaths = BaseClientResourcePaths &
  EcsResourcePaths &
  IndexedEcsResourcePaths &
  TerrainResourcePaths &
  PhysicsResourcePaths &
  WaterResourcePaths &
  LightingResourcePaths &
  MinigameResourcePaths &
  BlockResourcePaths &
  IsomorphismResourcePaths &
  GlassResourcePaths &
  FloraResourcePaths;

export type ClientResourceDeps = TypedResourceDeps<ClientResourcePaths>;
export type ClientResources = TypedResources<ClientResourcePaths>;
export type ClientResourcesBuilder =
  BiomesResourcesBuilder<ClientResourcePaths>;
export type ClientResourcesStats = ResourcesStats<ClientResourcePaths>;
export type ClientReactResources = ReactResources<ClientResourcePaths>;

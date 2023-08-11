import type { ClientContext } from "@/client/game/context";
import { addAudioResources } from "@/client/game/resources/audio";
import { addBeamResources } from "@/client/game/resources/beams";
import { addBlockResources } from "@/client/game/resources/blocks";
import { addNewBlueprintResources } from "@/client/game/resources/blueprints";
import { addBoundaryResources } from "@/client/game/resources/boundary";
import { addCameraResources } from "@/client/game/resources/camera";
import { addChallengeResources } from "@/client/game/resources/challenges";
import { addChatResources } from "@/client/game/resources/chat";
import { addCursorResources } from "@/client/game/resources/cursor";
import { addDropResources } from "@/client/game/resources/drops";
import { addFishingResources } from "@/client/game/resources/fishing";
import { addFloraResources } from "@/client/game/resources/florae";
import { addForbiddenEditsResources } from "@/client/game/resources/forbidden_edits";
import { addGameModalResources } from "@/client/game/resources/game_modal";
import { addGameStatusResources } from "@/client/game/resources/game_status";
import { addGlassResources } from "@/client/game/resources/glass";
import { addGraphicsSettingsResources } from "@/client/game/resources/graphics_settings";
import { addNewGroupPlacementResources } from "@/client/game/resources/group_placement";
import { addNewGroupResources } from "@/client/game/resources/groups";
import { addInventoryResources } from "@/client/game/resources/inventory";
import { addItemMeshResources } from "@/client/game/resources/item_mesh";
import { addLocalPlayerResources } from "@/client/game/resources/local_player";
import { addLocalRecipesResources } from "@/client/game/resources/local_recipes";
import { addMaterialsResources } from "@/client/game/resources/materials";
import { addMinigameResources } from "@/client/game/resources/minigames";
import { addMuckResources } from "@/client/game/resources/muck";
import { addNpcResources } from "@/client/game/resources/npcs";
import { addNUXResources } from "@/client/game/resources/nuxes";
import { addOverlayResources } from "@/client/game/resources/overlays";
import { addParticleResources } from "@/client/game/resources/particles";
import { addPlaceableResources } from "@/client/game/resources/placeables/placeables";
import { addPlayerMeshResources } from "@/client/game/resources/player_mesh";
import { addPlayerResources } from "@/client/game/resources/players";
import { addPreviewResources } from "@/client/game/resources/previews";
import { addProtectionResources } from "@/client/game/resources/protection";
import { addRenderPassResources } from "@/client/game/resources/render_passes";
import { addRobotResources } from "@/client/game/resources/robots";
import { addRulesetResources } from "@/client/game/resources/ruleset";
import { addSkyResources } from "@/client/game/resources/sky";
import { addSpaceClipboardResources } from "@/client/game/resources/space_clipboard";
import { addTerrainResources } from "@/client/game/resources/terrain";
import type { ClientResourcePaths } from "@/client/game/resources/types";
import { addWaterResources } from "@/client/game/resources/water";
import { addTableResources } from "@/shared/game/ecs_resources";
import { addSharedLightingResources } from "@/shared/game/resources/light";
import { addSharedPhysicsResources } from "@/shared/game/resources/physics";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import { getNowMs } from "@/shared/util/helpers";

export interface Clock {
  tick: number;
  time: number;
}

export async function resourcesBuilder(loader: RegistryLoader<ClientContext>) {
  const [config, table, indexedResources, resourcesStats, io, voxeloo] =
    await Promise.all([
      loader.get("clientConfig"),
      loader.get("table"),
      loader.get("indexedResources"),
      loader.get("resourcesStats"),
      loader.get("io"),
      loader.get("voxeloo"),
    ]);

  const builder = new BiomesResourcesBuilder<ClientResourcePaths>({
    collectorParams: { capacities: config.clientResourceCapacity },
    stats: resourcesStats,
  });

  addTableResources(table, builder);

  for (const indexedResource of indexedResources) {
    indexedResource.add(builder);
  }

  // Register scene global resources.
  builder.addGlobal("/focus", { focused: true });
  builder.addGlobal("/clock", { time: io.time.secondsSinceEpoch });
  builder.addGlobal("/scene/clock", { time: getNowMs() });
  builder.addGlobal("/sim/clock", {
    lastUpdateRenderTime: getNowMs(),
  });
  builder.addGlobal("/admin/current_biscuit", { id: INVALID_BIOMES_ID });
  builder.addGlobal("/admin/current_entity", {});
  builder.addGlobal("/admin/inline_admin_visible", { tab: undefined });
  builder.add("/server/time", () => io.time);

  // Register all resources concurrently.
  await Promise.all([
    addAudioResources(loader, builder),
    addBeamResources(loader, builder),
    addBlockResources(loader, builder),
    addGlassResources(loader, builder),
    addBoundaryResources(loader, builder),
    addCameraResources(loader, builder),
    addChallengeResources(loader, builder),
    addChatResources(loader, builder),
    addCursorResources(loader, builder),
    addDropResources(loader, builder),
    addFloraResources(loader, builder),
    addFishingResources(loader, builder),
    addForbiddenEditsResources(loader, builder),
    addGameModalResources(loader, builder),
    addGameStatusResources(loader, builder),
    addInventoryResources(loader, builder),
    addItemMeshResources(loader, builder),
    addLocalPlayerResources(loader, builder),
    addLocalRecipesResources(loader, builder),
    addMaterialsResources(loader, builder),
    addNUXResources(loader, builder),
    addNewGroupResources(loader, builder),
    addNewBlueprintResources(loader, builder),
    addNewGroupPlacementResources(loader, builder),
    addNpcResources(loader, builder),
    addOverlayResources(loader, builder),
    addParticleResources(loader, builder),
    addSharedPhysicsResources(voxeloo, builder),
    addPlaceableResources(loader, builder),
    addPlayerMeshResources(loader, builder),
    addPlayerResources(loader, builder),
    addPreviewResources(loader, builder),
    addMinigameResources(loader, builder),
    addSharedLightingResources(voxeloo, builder),
    addSkyResources(loader, builder),
    addTerrainResources(loader, builder),
    addWaterResources(loader, builder),
    addGraphicsSettingsResources(loader, builder),
    addRenderPassResources(loader, builder),
    addRulesetResources(loader, builder),
    addSpaceClipboardResources(loader, builder),
    addMuckResources(loader, builder),
    addRobotResources(loader, builder),
    addProtectionResources(loader, builder),
  ]);

  return builder;
}

import type { GardenHose } from "@/client/events/api";
import type { ClientContext } from "@/client/game/context";
import type { Events } from "@/client/game/context_managers/events";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type {
  ActionType,
  DestroyInfo,
  WithActionThottler,
} from "@/client/game/interact/types";
import type { Cursor } from "@/client/game/resources/cursor";
import { makeInitialCursor } from "@/client/game/resources/cursor";
import type { GroupPlacementPreview } from "@/client/game/resources/group_placement";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import type {
  Player,
  PlayerEnvironment,
} from "@/client/game/resources/players";
import type {
  ClientResourcePaths,
  ClientResources,
} from "@/client/game/resources/types";
import { defaultTweakableConfigValues } from "@/server/shared/minigames/ruleset/tweaks";
import type { TerrainName } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { zPlayerModifiersRequired } from "@/shared/bikkie/schema/types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { PlaceableComponent } from "@/shared/ecs/gen/components";
import type { TerrainShard } from "@/shared/ecs/gen/entities";
import type { TerrainHit } from "@/shared/game/spatial";
import type { ItemAndCount } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import { Timer } from "@/shared/metrics/timer";
import type { Args, Key, Ret } from "@/shared/resources/types";
import { generateTestId } from "@/shared/test_helpers";
import { TimeWindow } from "@/shared/util/throttling";
import type { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import { Dir } from "@/shared/wasm/types/common";
import assert from "assert";
import { entries } from "lodash";
import type { StubbedInstance } from "ts-sinon";
import { stubInterface } from "ts-sinon";

export type StubbedClientResources = ReturnType<typeof stubClientResources>;
export type StubbedClientContext = StubbedInstance<ClientContext>;

export function stubClientResources() {
  return stubInterface<ClientResources>();
}

export function stubClientResourceValue<K extends Key<ClientResourcePaths>>(
  stub: StubbedClientResources,
  path: K,
  ...args: [...Args<ClientResourcePaths, K>, Ret<ClientResourcePaths, K>]
) {
  const ret = args.pop();
  stub.get.withArgs(...([path, ...args] as any)).returns(ret);
}

export function stubClientContext(
  overrides: Partial<ClientContext>
): StubbedInstance<ClientContext> {
  const ret = stubInterface<ClientContext>();
  for (const [k, v] of entries(overrides)) {
    (ret as any)[k].returns(v);
  }
  return ret;
}

export function stubPlayerEnvironment(): StubbedInstance<PlayerEnvironment> {
  return {
    blockUnderPlayer: undefined,
    standingOnBlock: undefined,
    collidingEntities: new Set(),
    onGround: true,
    lastOnGround: new Timer(),
  };
}

export function defaultTestClientContextWithActionThrottler(
  voxeloo?: VoxelooModule
): StubbedInstance<WithActionThottler<ClientContext>> {
  const actionThrottler = new TimeWindow<ActionType>(10);
  const resources = stubClientResources();
  const permissionsManager = stubPermissionsManager();
  const gardenHose = stubGardenHose();
  const events = stubEvents();
  const table = stubTable();
  const userId = 12314 as BiomesId;

  const deps: WithActionThottler<StubbedClientContext> =
    stubClientContextWithActionThrottler({
      resources,
      actionThrottler,
      permissionsManager,
      gardenHose,
      events,
      table,
      userId,
      voxeloo,
    });
  const localPlayer: StubbedInstance<LocalPlayer> = stubLocalPlayer();
  const groupPlacementPreview = stubInterface<GroupPlacementPreview>();

  stubClientResourceValue(resources, "/scene/local_player", localPlayer);
  stubClientResourceValue(resources, "/clock", {
    time: 10,
  });
  stubClientResourceValue(resources, "/tweaks", defaultTweakableConfigValues);
  stubClientResourceValue(
    resources,
    "/player/modifiers",
    zPlayerModifiersRequired.parse({})
  );
  stubClientResourceValue(
    resources,
    "/groups/placement/preview",
    groupPlacementPreview
  );
  stubClientResourceValue(resources, "/scene/cursor", makeInitialCursor());

  return deps;
}

export function stubTerrainEntity(id: BiomesId): StubbedInstance<TerrainShard> {
  const ret = stubInterface<TerrainShard>();
  (ret as any).id = id;
  return ret;
}

export function stubTerrainTensor() {
  const ret = stubInterface<Tensor<"U32">>();
  return ret;
}

export function stubClientContextWithActionThrottler(
  overrides: Partial<WithActionThottler<ClientContext>>
): StubbedInstance<WithActionThottler<ClientContext>> {
  const ret = stubInterface<WithActionThottler<ClientContext>>();
  for (const [k, v] of entries(overrides)) {
    (ret as any)[k] = v;
  }
  return ret;
}

export function stubLocalPlayer() {
  const ret = stubInterface<LocalPlayer>();
  const player = stubInterface<Player>();
  player.position = [0, 0, 0];
  player.orientation = [0, 0];
  ret.player = player;
  return ret;
}

export function stubPermissionsManager() {
  const ret = stubInterface<PermissionsManager>();
  ret.getPermissionForAction.returns(true);
  return ret;
}

export function stubGardenHose() {
  const ret = stubInterface<GardenHose>();
  ret.publish.returns();
  return ret;
}

export function stubEvents() {
  const ret = stubInterface<Events>();
  ret.publish.returns(Promise.resolve());
  return ret;
}

export function stubTable() {
  const ret = stubInterface<ClientTable>();
  ret.scan.returns([]);
  return ret;
}

export const TEST_PLAYER_ID = 1 as BiomesId;

export function hotbarItemInfo(itemAndCount?: ItemAndCount): ClickableItemInfo {
  return {
    itemRef: {
      kind: "hotbar",
      idx: 0,
    },
    item: itemAndCount?.item,
    itemAndCount: itemAndCount,
  };
}

export function cursorAtBlock(terrainName: TerrainName): Cursor {
  const pos: Vec3 = [102, 0, 102];

  return {
    ...makeInitialCursor(),
    hit: <TerrainHit>{
      kind: "terrain",
      pos,
      terrainSample: {
        terrainId: getTerrainID(terrainName),
        dye: 0,
        moisture: 0,
        muck: 0,
      },
      distance: 2,
      face: Dir.X_NEG,
      terrainId: getTerrainID(terrainName),
    },
  };
}

export function cursorAtPlaceable(placeableId: BiomesId): Cursor {
  const pos: Vec3 = [102, 0, 102];

  return {
    ...makeInitialCursor(),
    hit: {
      kind: "entity",
      distance: 2,
      pos,
      entity: {
        id: placeableId,
        placed_by: {
          id: TEST_PLAYER_ID,
          placed_at: secondsSinceEpoch(),
        },
        created_by: {
          id: TEST_PLAYER_ID,
          created_at: secondsSinceEpoch(),
        },
        placeable_component: PlaceableComponent.create({
          item_id: generateTestId(),
          animation: undefined,
        }),
        position: {
          v: pos,
        },
      },
    },
  };
}

export function cursorAtBlueprint(blueprintId: BiomesId): Cursor {
  const pos: Vec3 = [102, 0, 102];

  return {
    ...makeInitialCursor(),
    hit: {
      kind: "blueprint",
      distance: 2,
      pos,
      blueprintEntityId: blueprintId,
      requiredItem: {
        kind: "terrain",
        position: pos,
        terrainId: getTerrainID("dirt"),
        blueprintId: BikkieIds.blueprintWorkbench,
      },
    },
  };
}

export function makeDestroyInfoFromCursor(cursor: Cursor): DestroyInfo {
  assert(cursor.hit?.kind === "terrain");
  return {
    start: 0,
    pos: cursor.hit.pos,
    face: cursor.hit.face,
    terrainId: cursor.hit?.terrainId,
    terrainSample: cursor?.hit?.terrainSample,
    groupId: undefined,
    canDestroy: true,
    allowed: true,
    hardnessClass: 0,
    finished: false,
    activeAction: {
      action: "destroy",
      toolRef: undefined,
      tool: undefined,
    },
    actionTimeMs: 200,
  };
}

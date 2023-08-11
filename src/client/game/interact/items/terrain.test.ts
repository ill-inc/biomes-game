import type { Events } from "@/client/game/context_managers/events";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type {
  StubbedClientContext,
  StubbedClientResources,
} from "@/client/game/interact/item_types/test_helpers";
import {
  cursorAtBlock,
  defaultTestClientContextWithActionThrottler,
  hotbarItemInfo,
  stubClientResourceValue,
  stubPlayerEnvironment,
  stubTerrainEntity,
  stubTerrainTensor,
} from "@/client/game/interact/item_types/test_helpers";
import { TerrainSpec } from "@/client/game/interact/items/terrain";
import type { WithActionThottler } from "@/client/game/interact/types";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { TerrainName } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { EditEvent } from "@/shared/ecs/gen/events";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { add } from "@/shared/math/linear";
import { sleep } from "@/shared/util/async";
import assert from "assert";
import type { StubbedInstance } from "ts-sinon";

describe("Terrain Spec", () => {
  before(async () => {
    await loadVoxeloo();
  });

  let deps!: WithActionThottler<StubbedClientContext>;
  let events: StubbedInstance<Events>;
  let resources!: StubbedClientResources;
  let itemSpec!: TerrainSpec;
  let permissionsManager!: StubbedInstance<PermissionsManager>;

  beforeEach(() => {
    deps = defaultTestClientContextWithActionThrottler();
    resources = deps.resources as StubbedClientResources;
    events = deps.events as StubbedInstance<Events>;
    permissionsManager =
      deps.permissionsManager as StubbedInstance<PermissionsManager>;
    itemSpec = new TerrainSpec(deps);
    permissionsManager.itemActionAllowedAt.returns(true);
  });

  it("primary places when block is selected", async () => {
    const TEST_TERRAIN = 123 as BiomesId;
    const cursor = cursorAtBlock("grass");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    stubClientResourceValue(
      resources,
      "/ecs/terrain",
      voxelShard(101, 0, 102),
      stubTerrainEntity(TEST_TERRAIN)
    );
    stubClientResourceValue(
      resources,
      "/players/environment",
      deps.userId,
      stubPlayerEnvironment()
    );
    itemSpec.onPrimaryDown(hotbarItemInfo(countOf(BikkieIds.stone, 1n)));
    // Allow fire and forget to go through
    await sleep(1);
    const event: EditEvent = events.publish.getCall(0).firstArg;
    assert.deepEqual(event.position, add(cursor.hit!.pos, [-1, 0, 0]));
    assert.deepEqual(
      event.value,
      getTerrainID(anItem(BikkieIds.stone).terrainName! as TerrainName)
    );
  });

  it("primary places when block on non-collidable terrain", async () => {
    const TEST_TERRAIN = 123 as BiomesId;
    const nonCollideableFlora = 16777232;
    const cursor = cursorAtBlock("grass");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    stubClientResourceValue(
      resources,
      "/ecs/terrain",
      voxelShard(101, 0, 102),
      stubTerrainEntity(TEST_TERRAIN)
    );
    const stubTensor = stubTerrainTensor();
    stubClientResourceValue(
      resources,
      "/terrain/tensor",
      voxelShard(101, 0, 102),
      stubTensor
    );

    stubClientResourceValue(
      resources,
      "/players/environment",
      deps.userId,
      stubPlayerEnvironment()
    );

    stubTensor.get.returns(nonCollideableFlora);

    itemSpec.onPrimaryDown(hotbarItemInfo(countOf(BikkieIds.stone, 1n)));
    // Allow fire and forget to go through
    await sleep(1);
    const event: EditEvent = events.publish.getCall(0).firstArg;
    assert.deepEqual(event.position, cursor.hit!.pos);
    assert.deepEqual(
      event.value,
      getTerrainID(anItem(BikkieIds.stone).terrainName! as TerrainName)
    );
  });
});

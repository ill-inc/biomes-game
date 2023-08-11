import type { Events } from "@/client/game/context_managers/events";
import type {
  StubbedClientContext,
  StubbedClientResources,
} from "@/client/game/interact/item_types/test_helpers";
import {
  cursorAtBlock,
  defaultTestClientContextWithActionThrottler,
  hotbarItemInfo,
  stubClientResourceValue,
  stubTerrainEntity,
} from "@/client/game/interact/item_types/test_helpers";
import { ShapeItemSpec } from "@/client/game/interact/items/shape";
import type { WithActionThottler } from "@/client/game/interact/types";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ShapeEvent } from "@/shared/ecs/gen/events";
import { countOf } from "@/shared/game/items";
import { voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { sleep } from "@/shared/util/async";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { BlockTensor } from "@/shared/wasm/types/galois";
import assert from "assert";
import type { StubbedInstance } from "ts-sinon";
import { stubInterface } from "ts-sinon";

describe("Shaper Spec", () => {
  let voxeloo!: VoxelooModule;
  before(async () => {
    voxeloo = await loadVoxeloo();
  });

  let deps!: WithActionThottler<StubbedClientContext>;
  let events: StubbedInstance<Events>;
  let resources!: StubbedClientResources;
  let itemSpec!: ShapeItemSpec;

  beforeEach(() => {
    deps = defaultTestClientContextWithActionThrottler(voxeloo);
    resources = deps.resources as StubbedClientResources;
    events = deps.events as StubbedInstance<Events>;
    itemSpec = new ShapeItemSpec(deps);
  });

  it("can shape terrain", async () => {
    const TEST_TERRAIN = 123 as BiomesId;
    const cursor = cursorAtBlock("grass");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    stubClientResourceValue(
      resources,
      "/ecs/terrain",
      voxelShard(101, 0, 102),
      stubTerrainEntity(TEST_TERRAIN)
    );

    const blockTensor = stubInterface<BlockTensor>();
    stubClientResourceValue(
      resources,
      "/terrain/block/tensor",
      voxelShard(101, 0, 102),
      new Tensor(voxeloo, blockTensor)
    );
    blockTensor.get.returns(100);
    itemSpec.onPrimaryDown(hotbarItemInfo(countOf(BikkieIds.woodenFencer, 1n)));
    // Allow fire and forget to go through
    await sleep(1);
    const event: ShapeEvent = events.publish.getCall(0).firstArg;
    assert.deepEqual(event.position, cursor.hit!.pos);
  });
});

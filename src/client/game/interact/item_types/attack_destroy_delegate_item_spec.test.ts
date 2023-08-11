import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import { AttackDestroyDelegateItemSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type {
  StubbedClientContext,
  StubbedClientResources,
} from "@/client/game/interact/item_types/test_helpers";
import {
  cursorAtBlock,
  cursorAtBlueprint,
  cursorAtPlaceable,
  defaultTestClientContextWithActionThrottler,
  hotbarItemInfo,
  makeDestroyInfoFromCursor,
  stubClientResourceValue,
} from "@/client/game/interact/item_types/test_helpers";
import type { WithActionThottler } from "@/client/game/interact/types";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { hitExistingTerrain } from "@/shared/game/spatial";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";
import type { StubbedInstance } from "ts-sinon";

describe("Attack and Destroy Spec", () => {
  before(async () => {
    await loadVoxeloo();
  });

  let deps!: WithActionThottler<StubbedClientContext>;
  let localPlayer: StubbedInstance<LocalPlayer>;
  let resources!: StubbedClientResources;
  let itemSpec!: AttackDestroyDelegateItemSpec;
  let permissionsManager!: StubbedInstance<PermissionsManager>;

  const advanceClock = (seconds: number) => {
    stubClientResourceValue(resources, "/clock", {
      time: ((resources.get("/clock")! as any).time as number) + seconds,
    });
  };

  beforeEach(() => {
    deps = defaultTestClientContextWithActionThrottler();
    localPlayer = deps.resources.get(
      "/scene/local_player"
    ) as unknown as StubbedInstance<LocalPlayer>;
    resources = deps.resources as StubbedClientResources;
    permissionsManager =
      deps.permissionsManager as StubbedInstance<PermissionsManager>;
    itemSpec = new AttackDestroyDelegateItemSpec(deps, {});
  });

  it("attacks on primary if cursor empty", async () => {
    assert.ok(!localPlayer.startAttack.calledOnce);
  });

  it("destroys on primary when nothing is selected and cursor hits", async () => {
    const cursor = cursorAtBlock("grass");
    stubClientResourceValue(resources, "/scene/cursor", cursor);

    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.deepEqual(localPlayer.destroyInfo, {
      actionTimeMs: 1400.560224089636,
      activeAction: {
        action: "destroy",
        click: "primary",
        tool: undefined,
        toolRef: {
          idx: 0,
          kind: "hotbar",
        },
      },
      allowed: true,
      canDestroy: true,
      face: 0,
      finished: false,
      groupId: undefined,
      hardnessClass: 1,
      pos: hitExistingTerrain(cursor.hit) ? cursor.hit.pos : undefined,
      start: 10,
      terrainId: 1,
      terrainSample: {
        dye: 0,
        moisture: 0,
        muck: 0,
        terrainId: 1,
      },
    });
  });

  it("destroy deactivates after looking away from terrain", () => {
    localPlayer.destroyInfo = makeDestroyInfoFromCursor(cursorAtBlock("grass"));
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.deepEqual(localPlayer.destroyInfo, undefined);
  });

  it("disallow destruction if destruction not allowed", () => {
    const cursor = cursorAtBlock("grass");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    permissionsManager.getPermissionForAction.returns(false);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.strictEqual(localPlayer.destroyInfo?.canDestroy, false);

    stubClientResourceValue(resources, "/clock", {
      time: 100000000,
    });

    assert.throws(() => {
      itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    });
  });

  it("gives an error if hardness is too high", () => {
    const cursor = cursorAtBlock("bedrock");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.strictEqual(localPlayer.destroyInfo?.canDestroy, false);

    stubClientResourceValue(resources, "/clock", {
      time: 100000000,
    });

    assert.throws(() => {
      itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    });
  });

  it("can destroy terrain", () => {
    const cursor = cursorAtBlock("grass");
    assert(cursor.hit?.kind === "terrain");
    stubClientResourceValue(resources, "/scene/cursor", cursor);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.terrainId, cursor.hit.terrainId);
    assert(!localPlayer.destroyInfo?.finished);
    assert(!localPlayer.destroyInfo?.percentage);

    advanceClock(1);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.terrainId, cursor.hit.terrainId);
    assert(!localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);

    advanceClock(99);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.terrainId, cursor.hit.terrainId);
    assert(localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);
  });

  it("can destroy placeable", () => {
    const TEST_PLACEABLE_ID = 11 as BiomesId;
    stubClientResourceValue(
      resources,
      "/scene/cursor",
      cursorAtPlaceable(TEST_PLACEABLE_ID)
    );
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.placeableId, TEST_PLACEABLE_ID);
    assert(!localPlayer.destroyInfo?.finished);
    assert(!localPlayer.destroyInfo?.percentage);

    advanceClock(1);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.placeableId, TEST_PLACEABLE_ID);
    assert(!localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);

    advanceClock(99);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.placeableId, TEST_PLACEABLE_ID);
    assert(localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);
  });

  it("can destroy blueprints", () => {
    const TEST_BLUEPRINT_ID = 11 as BiomesId;
    stubClientResourceValue(
      resources,
      "/scene/cursor",
      cursorAtBlueprint(TEST_BLUEPRINT_ID)
    );
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.blueprintId, TEST_BLUEPRINT_ID);
    assert(!localPlayer.destroyInfo?.finished);
    assert(!localPlayer.destroyInfo?.percentage);

    advanceClock(1);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.blueprintId, TEST_BLUEPRINT_ID);
    assert(!localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);

    advanceClock(9999);
    itemSpec.tryDestroyTick(hotbarItemInfo(), "primary");
    assert.equal(localPlayer.destroyInfo?.blueprintId, TEST_BLUEPRINT_ID);
    assert(localPlayer.destroyInfo?.finished);
    assert(localPlayer.destroyInfo?.percentage);
  });
});

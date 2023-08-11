import { newPlayer } from "@/server/logic/utils/players";
import type { Firehose } from "@/server/shared/firehose/api";
import { InMemoryFirehose } from "@/server/shared/firehose/memory";
import type { BDB } from "@/server/shared/storage";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import type { WorldApi } from "@/server/shared/world/api";
import { ShimWorldApi } from "@/server/shared/world/shim/api";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import { Observer } from "@/server/sync/subscription/game_observer";
import { Scanner } from "@/server/sync/subscription/scanner";
import { SyncIndex } from "@/server/sync/subscription/sync_index";
import type { SyncTarget } from "@/shared/api/sync";
import { zSyncChange } from "@/shared/api/sync";
import { Iced } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { VersionMap } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import { yieldToOthers } from "@/shared/util/async";
import assert from "assert";

const USER_ID = 1234 as BiomesId;
const RANDOM_ENTITY_ID = 31337 as BiomesId;
const ID_A = 33 as BiomesId;
const ID_B = 44 as BiomesId;
const SYNC_RADIUS = 100;

describe("Observer tests", () => {
  let db!: BDB;
  let world!: InMemoryWorld;
  let worldApi!: WorldApi;
  let firehose!: Firehose;
  let syncIndex!: SyncIndex;
  let scanner!: Scanner;
  let observer!: Observer;

  beforeEach(async () => {
    db = createBdb(await createStorageBackend("memory"));
    world = new InMemoryWorld();

    world.applyChanges([
      {
        kind: "create",
        entity: {
          ...newPlayer(USER_ID, "TestPlayer"),
          position: { v: [0, 0, 0] },
        },
      },
    ]);

    worldApi = ShimWorldApi.createForWorld(world);
    firehose = new InMemoryFirehose();
    syncIndex = new SyncIndex(worldApi);
    await syncIndex.start();
    scanner = new Scanner(db, syncIndex, USER_ID, SYNC_RADIUS);
  });

  afterEach(async () => {
    await scanner.stop();
    await syncIndex.stop();
  });

  const createObserverForSyncTarget = (
    syncTarget: SyncTarget,
    versionMap?: VersionMap
  ) => {
    observer = new Observer(
      {
        worldApi,
        syncIndex,
        firehose,
      },
      syncTarget,
      versionMap ?? new Map(),
      scanner
    );
  };

  const createLocalObserver = (versionMap?: VersionMap) => {
    createObserverForSyncTarget(
      {
        kind: "localUser",
        userId: USER_ID,
      },
      versionMap
    );
  };

  const pull = (count: number) => {
    const results = observer.pull(count);
    return results.map((r) => zSyncChange.parse(r).change);
  };

  it("Should include the player initially", async () => {
    createLocalObserver();

    const initial = await observer.start();
    assert.deepEqual(
      initial.map((c) => zSyncChange.parse(c).change),
      [
        {
          kind: "update",
          tick: 1,
          entity: {
            ...world.table.get(WorldMetadataId),
            synthetic_stats: {
              online_players: 1,
            },
          },
        },
        {
          kind: "update",
          tick: 2,
          entity: world.table.get(USER_ID),
        },
      ]
    );
  });

  it("Should deice players on load", async () => {
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: USER_ID,
          iced: Iced.create({}),
        },
      },
    ]);
    assert.ok(world.table.get(USER_ID)?.iced);
    createLocalObserver();

    const initial = await observer.start();
    assert.deepEqual(
      initial.map((c) => zSyncChange.parse(c).change),
      [
        {
          kind: "update",
          tick: 1,
          entity: {
            ...world.table.get(WorldMetadataId),
            synthetic_stats: {
              online_players: 1,
            },
          },
        },
        {
          kind: "update",
          tick: 3,
          entity: { ...world.table.get(USER_ID), iced: undefined },
        },
      ]
    );
  });

  it("Should synthesize entity when observe mode for entity", async () => {
    world.applyChanges([
      {
        kind: "create",
        entity: {
          id: RANDOM_ENTITY_ID,
          position: { v: [0, 0, 0] },
        },
      },
    ]);
    createObserverForSyncTarget({
      kind: "entity",
      entityId: RANDOM_ENTITY_ID,
    });

    const initial = await observer.start();
    assert.deepEqual(
      initial.map((c) => zSyncChange.parse(c).change),
      [
        {
          kind: "update",
          tick: 1,
          entity: {
            ...world.table.get(WorldMetadataId),
            synthetic_stats: {
              online_players: 1,
            },
          },
        },
        {
          kind: "update",
          tick: 3,
          entity: world.table.get(RANDOM_ENTITY_ID),
        },
      ]
    );
  });

  it("Should not deice entity when observe mode for entity", async () => {
    world.applyChanges([
      {
        kind: "create",
        entity: {
          id: RANDOM_ENTITY_ID,
          position: { v: [0, 0, 0] },
          iced: Iced.create({}),
        },
      },
    ]);
    createObserverForSyncTarget({
      kind: "entity",
      entityId: RANDOM_ENTITY_ID,
    });

    const initial = await observer.start();
    assert.deepEqual(
      initial.map((c) => zSyncChange.parse(c).change),
      [
        {
          kind: "update",
          tick: 1,
          entity: {
            ...world.table.get(WorldMetadataId),
            synthetic_stats: {
              online_players: 1,
            },
          },
        },
        {
          kind: "update",
          tick: 3,
          entity: world.table.get(RANDOM_ENTITY_ID),
        },
      ]
    );
  });

  it("Should sync only the item within the bubble", async () => {
    createLocalObserver();

    const include = <Entity>{
      id: ID_A,
      label: { text: "Lost in the void" },
    };
    const exclude = <Entity>{
      id: ID_B,
      position: { v: [0, 1000, 0] },
      label: { text: "Far away" },
    };

    await observer.start();

    world.applyChanges(
      [include, exclude].map((e) => ({ kind: "create", entity: e }))
    );
    await yieldToOthers();

    assert.deepEqual(pull(100), [ID_A]);
  });

  it("Should sync only the item within the bubble", async () => {
    createLocalObserver();

    const include = <Entity>{
      id: ID_A,
      position: { v: [0, 1, 0] },
      label: { text: "A" },
    };
    const exclude = <Entity>{
      id: ID_B,
      position: { v: [0, 1000, 0] },
      label: { text: "B" },
    };

    await observer.start();

    world.applyChanges(
      [include, exclude].map((e) => ({ kind: "create", entity: e }))
    );
    await yieldToOthers();

    assert.deepEqual(pull(100), [ID_A]);

    // Update A and B
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: ID_A,
          label: { text: "A2" },
        },
      },
      {
        kind: "update",
        entity: {
          id: ID_B,
          label: { text: "B2" },
        },
      },
    ]);
    await yieldToOthers();

    assert.deepEqual(pull(100), [
      {
        kind: "update",
        tick: 4,
        entity: {
          id: ID_A,
          label: { text: "A2" },
        },
      },
    ]);

    // Now move A out of range.
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: ID_A,
          position: { v: [0, 1000, 0] },
        },
      },
    ]);
    await yieldToOthers();

    assert.deepEqual(pull(100), [
      {
        kind: "delete",
        tick: 4,
        id: ID_A,
      },
    ]);

    // Move A and B into range.
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: ID_A,
          position: { v: [0, 50, 0] },
        },
      },
      {
        kind: "update",
        entity: {
          id: ID_B,
          position: { v: [50, 50, 0] },
        },
      },
    ]);
    await yieldToOthers();

    assert.deepEqual(pull(100), [ID_A, ID_B]);
  });

  it("Should support the bubble moving", async () => {
    createLocalObserver();

    const include = <Entity>{
      id: ID_A,
      position: { v: [0, 1, 0] },
      label: { text: "A" },
    };
    const exclude = <Entity>{
      id: ID_B,
      position: { v: [0, 1000, 0] },
      label: { text: "B" },
    };

    await observer.start();

    world.applyChanges(
      [include, exclude].map((e) => ({ kind: "create", entity: e }))
    );
    await yieldToOthers();

    assert.deepEqual(pull(100), [ID_A]);

    // Move the bubble.
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: USER_ID,
          position: { v: [0, 1000, 0] },
        },
      },
    ]);
    await yieldToOthers();

    // Note, A isn't deleted but is outside range.
    assert.deepEqual(pull(100), [
      ID_B,
      {
        kind: "update",
        tick: 4,
        entity: {
          id: USER_ID,
          position: { v: [0, 1000, 0] },
        },
      },
    ]);

    // Update A
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: ID_A,
          label: { text: "A2" },
        },
      },
    ]);
    await yieldToOthers();

    // A is now deleted.
    assert.deepEqual(pull(100), [
      {
        kind: "delete",
        tick: 3,
        id: ID_A,
      },
    ]);

    // Move back.
    world.applyChanges([
      {
        kind: "update",
        entity: {
          id: USER_ID,
          position: { v: [0, 0, 0] },
        },
      },
    ]);
    await yieldToOthers();

    assert.deepEqual(pull(100), [
      ID_A,
      {
        kind: "update",
        tick: 6,
        entity: {
          id: USER_ID,
          position: { v: [0, 0, 0] },
        },
      },
    ]);
  });
});

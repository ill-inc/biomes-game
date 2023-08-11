import { AskApi, zAskService } from "@/server/ask/api";
import { AskServiceImpl } from "@/server/ask/service";
import type { EventHandlerMap } from "@/server/logic/events/all";
import { eventHandlerMapFor } from "@/server/logic/events/all";
import { EventBatchContext } from "@/server/logic/events/context/batch_context";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { groupByHandler } from "@/server/logic/events/grouping";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { newPlayer } from "@/server/logic/utils/players";
import { AdminRobot, UserRobot } from "@/server/logic/utils/robot";
import type { GameEvent } from "@/server/shared/api/game_event";
import type { LogicApi } from "@/server/shared/api/logic";
import { GenericCache } from "@/server/shared/cache/generic_cache";
import type { Firehose } from "@/server/shared/firehose/api";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { IdPoolGenerator, IdPoolLoan } from "@/server/shared/ids/pool";
import { TestIdGenerator } from "@/server/shared/ids/test_helpers";
import { bootstrapServerMods } from "@/server/shared/minigames/server_bootstrap";
import type { BDB, ServerTasksSchema } from "@/server/shared/storage";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import type { CollectionReference } from "@/server/shared/storage/schema";
import { TaskProcessor } from "@/server/shared/tasks/processor";
import { serverTaskGraph } from "@/server/shared/tasks/server_tasks/graph";
import type { ServerTaskProcessor } from "@/server/shared/tasks/server_tasks/server_task_processor";
import type { GraphTaskList } from "@/server/shared/tasks/types";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import type { WebServerConfig } from "@/server/web/config";
import type { ServerCache } from "@/server/web/server_cache";
import { getTerrainID, isTerrainName } from "@/shared/asset_defs/terrain";
import { BikkieIds } from "@/shared/bikkie/ids";
import { using, usingAll } from "@/shared/deletable";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  AclComponent,
  Box,
  Position,
  Restoration,
  ShardDiff,
  ShardSeed,
  ShardShapes,
  Size,
  UserRoles,
} from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type {
  ReadonlyEntity,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type {
  Item,
  ItemAndCount,
  ItemBag,
  OwnedItemReference,
  Vec2f,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import { addToBag, containerToBag, createBag } from "@/shared/game/items";
import type { ShardId } from "@/shared/game/shard";
import * as Shard from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { generateTestId } from "@/shared/test_helpers";
import { loadBlockWrapper, saveBlock } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";
import assert, { ok } from "assert";

export function editEntity(
  world: InMemoryWorld,
  id: BiomesId,
  apply: (entity: Delta) => void
) {
  const [version, entity] = world.table.getWithVersion(id);
  ok(entity, `Entity ${id} not found`);
  const builder = new PatchableEntity(entity);
  apply(builder);
  const delta = builder.finish();
  if (delta !== undefined) {
    world.writeableTable.apply([
      {
        kind: "update",
        tick: version.tick,
        entity: delta,
      },
    ]);
  }
}

export class TestLogicApi implements LogicApi {
  public readonly world: InMemoryWorld;
  private readonly idPool = new IdPoolGenerator(
    new TestIdGenerator(),
    () => 10
  );

  private eventHandlerMap: EventHandlerMap;

  constructor(private readonly voxeloo: VoxelooModule, world?: InMemoryWorld) {
    this.world = world ?? new InMemoryWorld();
    this.eventHandlerMap = eventHandlerMapFor(bootstrapServerMods());
  }

  async ping(): Promise<void> {}

  async publish(...events: GameEvent[]): Promise<void> {
    const batchContext = new EventBatchContext(
      this.voxeloo,
      new LogicVersionedEntitySource(this.voxeloo, this.world.adaptedTable),
      secondsSinceEpoch()
    );

    const work = groupByHandler(
      this.eventHandlerMap,
      events.map((e) => e.event)
    );
    const [todo] = batchContext.prepareAll(work);
    if (todo.length === 0) {
      return;
    }

    const loan = new IdPoolLoan(this.idPool);
    const proposals = await batchContext.processEvents(loan, todo);
    if (proposals.length === 0) {
      return;
    }
    this.world.apply(proposals.map((p) => p.transaction));
  }

  assertEditedVoxels(edits: EditType[]) {
    return assertEditedVoxels(this.voxeloo, this.world, edits);
  }
}

export function newTestAskApi(world: InMemoryWorld): AskApi {
  return new AskApi(
    makeClientFromImplementation(
      zAskService,
      new AskServiceImpl(world.adaptedTable)
    )
  );
}

export async function newTestDB(): Promise<BDB> {
  return createBdb(await createStorageBackend("memory"));
}

export async function newTestWebserverConfig(): Promise<WebServerConfig> {
  return {
    assetServerMode: "local",
    bikkieCacheMode: "none",
    biscuitMode: "memory",
    chatApiMode: "shim",
    copyOnWriteSnapshot: "test",
    firehoseMode: "memory",
    serverCacheMode: "none",
    storageMode: "memory",
    worldApiMode: "shim",
  };
}

export async function newTaskProcessor<Graph extends GraphTaskList>(
  db: BDB,
  idGenerator: IdGenerator,
  firehose: Firehose,
  logicApi: LogicApi,
  taskGraph: Graph
): Promise<TaskProcessor<Graph>> {
  return new TaskProcessor(
    {
      db,
      firehose,
      idGenerator,
      logicApi,
    },
    taskGraph,
    db.collection("server-tasks-dev") as CollectionReference<ServerTasksSchema>
  );
}

export async function newTestServerTaskProcessor(
  db: BDB,
  idGenerator: IdGenerator,
  firehose: Firehose,
  logicApi: LogicApi
): Promise<ServerTaskProcessor> {
  return newTaskProcessor(db, idGenerator, firehose, logicApi, serverTaskGraph);
}

export async function newTestCache(): Promise<ServerCache> {
  return new GenericCache({
    get: async () => null,
    del: async () => {},
    set: async () => {},
  });
}

export function setItemAtSlotIndex(
  world: InMemoryWorld,
  entityId: BiomesId,
  item: ItemAndCount,
  slotIdx: number
) {
  editEntity(world, entityId, (entity) => {
    ok(entity.inventory());
    ok(entity.inventory()!.items.length > slotIdx);
    entity.mutableInventory().items[slotIdx] = item;
  });
}

export async function addGameRobot(
  world: InMemoryWorld,
  robotId: BiomesId,
  admin?: boolean,
  creatorId?: BiomesId
): Promise<ReadonlyEntity> {
  ok(!world.table.has(robotId));

  const baseRobotParams = {
    id: robotId,
    position: [0, 0, 0] as Vec3f,
    orientation: [0, 0] as Vec2f,
    item: anItem(BikkieIds.biomesRobot),
  };

  const context = {
    create: (robotParams: any) => {
      world.applyChanges([
        {
          kind: "create",
          entity: robotParams,
        },
      ]);
    },
  };

  if (admin) {
    AdminRobot.createNew(context, baseRobotParams);
  } else {
    ok(creatorId);
    UserRobot.createNew(context, {
      ...baseRobotParams,
      creator: creatorId,
    });
  }

  const ret = world.table.get(robotId);
  ok(ret);
  return ret;
}

export async function addGameUser(
  world: InMemoryWorld,
  id: BiomesId,
  {
    fullname,
    position,
  }: {
    fullname?: string;
    position?: Vec3f;
  } = {}
) {
  ok(!world.table.has(id));
  const entity = {
    ...newPlayer(id, fullname ?? "Some User"),
    ...(position
      ? {
          position: Position.create({ v: position }),
        }
      : {}),
    user_roles: UserRoles.create({
      roles: new Set(["groundskeeper"]),
    }),
  };
  world.applyChanges([
    {
      kind: "create",
      entity,
    },
  ]);
  const ret = world.table.get(id);
  ok(ret);
  return ret;
}

export function createSolidTerrainShard(
  voxeloo: VoxelooModule,
  world: InMemoryWorld,
  v0: Vec3f,
  composedOf: Item
) {
  const v1 = add(v0, [Shard.SHARD_DIM, Shard.SHARD_DIM, Shard.SHARD_DIM]);

  const buffer = usingAll([new voxeloo.VolumeBlock_U32()], (seedBlock) => {
    const terrainName = composedOf.terrainName;
    ok(terrainName && isTerrainName(terrainName));
    seedBlock.fill(getTerrainID(terrainName));
    return saveBlock(voxeloo, seedBlock);
  });
  const id = generateTestId();
  world.writeableTable.apply([
    {
      kind: "create",
      tick: world.table.tick,
      entity: {
        id,
        box: Box.create({ v0, v1 }),
        shard_seed: ShardSeed.create({ buffer }),
        shard_diff: ShardDiff.create(),
        shard_shapes: ShardShapes.create(),
      },
    },
  ]);
  return id;
}

export function createEmptyTerrainShard(world: InMemoryWorld, v0: Vec3f) {
  const id = generateTestId();
  const v1 = add(v0, [Shard.SHARD_DIM, Shard.SHARD_DIM, Shard.SHARD_DIM]);
  world.writeableTable.apply([
    {
      kind: "create",
      tick: world.table.tick,
      entity: {
        id,
        box: Box.create({ v0, v1 }),
        shard_seed: ShardSeed.create(),
        shard_diff: ShardDiff.create(),
        shard_shapes: ShardShapes.create(),
      },
    },
  ]);
  return id;
}

export function createRestorationField(
  world: InMemoryWorld,
  position: ReadonlyVec3,
  size: ReadonlyVec3,
  delay: number
) {
  world.writeableTable.apply([
    {
      kind: "create",
      tick: world.table.tick,
      entity: {
        id: generateTestId(),
        position: Position.create({ v: [...position] }),
        size: Size.create({ v: [...size] }),
        restoration: Restoration.create({
          restore_delay_s: delay,
        }),
        acl_component: AclComponent.create({}),
      },
    },
  ]);
}

export interface EditType {
  pos: Vec3f;
  composedOf: Item | undefined;
}

function mapEditsToShards(edits: EditType[]) {
  const shardToEdits: Map<ShardId, EditType[]> = new Map();
  for (const edit of edits) {
    const id = Shard.voxelShard(...edit.pos);
    let shardEdits = shardToEdits.get(id);
    if (!shardEdits) {
      shardEdits = [];
      shardToEdits.set(id, shardEdits);
    }
    shardEdits.push(edit);
  }
  return shardToEdits;
}

export function createEditedVoxels(
  voxeloo: VoxelooModule,
  world: InMemoryWorld,
  edits: EditType[]
) {
  const shardToEdits = mapEditsToShards(edits);
  for (const [shardId, shardEdits] of shardToEdits) {
    const terrain = world.table.get(TerrainShardSelector.query.key(shardId));
    ok(terrain);
    editEntity(world, terrain.id, (entity) => {
      entity.setShardDiff(
        ShardDiff.create({
          buffer: using(new voxeloo.SparseBlock_U32(), (editsBlock) => {
            const diff = entity.shardDiff();
            if (diff) {
              loadBlockWrapper(voxeloo, editsBlock, diff);
            }
            for (const edit of shardEdits) {
              const blockPos = Shard.blockPos(...edit.pos);
              if (!edit.composedOf) {
                editsBlock.del(...blockPos);
                continue;
              }
              const terrainName = edit.composedOf.terrainName;
              ok(terrainName && isTerrainName(terrainName));
              const material = getTerrainID(terrainName);
              editsBlock.set(...blockPos, material);
            }
            return saveBlock(voxeloo, editsBlock);
          }),
        })
      );
    });
  }
}

export function assertEditedVoxels(
  voxeloo: VoxelooModule,
  world: InMemoryWorld,
  edits: EditType[]
) {
  const shardToEdits = mapEditsToShards(edits);
  for (const [shardId, shardEdits] of shardToEdits) {
    const terrain = world.table.get(TerrainShardSelector.query.key(shardId));
    ok(terrain);
    using(new voxeloo.SparseBlock_U32(), (editsBlock) => {
      loadBlockWrapper(voxeloo, editsBlock, terrain.shard_diff);
      for (const edit of shardEdits) {
        const blockPos = Shard.blockPos(...edit.pos);
        const terrainName = edit.composedOf?.terrainName;
        const material =
          terrainName && isTerrainName(terrainName)
            ? getTerrainID(terrainName)
            : undefined;
        assert.equal(
          editsBlock.get(...blockPos),
          material,
          `Material mismatch [at ${edit.pos} - ${edit.composedOf} - ${terrainName}]`
        );
      }
    });
  }
}

export function getEntitiesWithComponent<C extends keyof Entity>(
  world: InMemoryWorld,
  component: C
): ReadonlyEntityWith<C>[] {
  const matches: ReadonlyEntityWith<C>[] = [];
  for (const entity of world.table.contents()) {
    if (Entity.has(entity, component)) {
      matches.push(entity);
    }
  }
  return matches;
}

export function testInventoryEditor(entity: Delta) {
  return new PlayerInventoryEditor({ publish: () => {} }, entity);
}

export function updateInventory(
  world: InMemoryWorld,
  id: BiomesId,
  ref: OwnedItemReference,
  value?: ItemAndCount
) {
  editEntity(world, id, (entity) => {
    const inventory = testInventoryEditor(entity);
    inventory.set(ref, value);
  });
}

export function cleanInventory(world: InMemoryWorld, id: BiomesId) {
  editEntity(world, id, (entity) => {
    const inventory = testInventoryEditor(entity);
    const allContents = getAllInventory(inventory);
    inventory.takeOrThrow(allContents);
  });
}

export function getAllInventory(
  editor: PlayerInventoryEditor | ReadonlyEntity
): ItemBag {
  if (!(editor instanceof PlayerInventoryEditor)) {
    return getAllInventory(testInventoryEditor(new PatchableEntity(editor)));
  }
  const allContents = createBag();
  if (editor.inventory()) {
    addToBag(allContents, containerToBag(editor.inventory().hotbar));
    addToBag(allContents, containerToBag(editor.inventory().items));
  }
  return allContents;
}

import type { AskService } from "@/server/ask/api";
import { zAskService } from "@/server/ask/api";
import { AskServiceImpl } from "@/server/ask/service";
import type { AskMetaIndex } from "@/server/ask/table";
import { createAskIndexConfig } from "@/server/ask/table";
import type { LogicMetaIndex } from "@/server/logic/ecs";
import { createLogicIndexConfig } from "@/server/logic/ecs";
import type { EventHandlerMap } from "@/server/logic/events/all";
import { registerEventHandlerMap } from "@/server/logic/events/all";
import {
  EventBatchContext,
  idsInTodo,
} from "@/server/logic/events/context/batch_context";
import { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import { groupByHandler } from "@/server/logic/events/grouping";
import { registerEventIdPool } from "@/server/logic/events/processor";
import type { LockMapScope } from "@/server/logic/lock_map";
import { LockMap } from "@/server/logic/lock_map";
import type {
  LogicService,
  PublishRequest,
  PublishResponse,
} from "@/server/shared/api/logic";
import { zLogicService } from "@/server/shared/api/logic";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { materializeLazyChange } from "@/server/shared/ecs/lazy";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import type { IdPoolGenerator } from "@/server/shared/ids/pool";
import { IdPoolLoan } from "@/server/shared/ids/pool";
import { runServer } from "@/server/shared/main";
import { registerServerMods } from "@/server/shared/minigames/server_bootstrap";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import { HostPort } from "@/server/shared/ports";
import { Replica } from "@/server/shared/replica/table";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import type { ZrpcServer } from "@/server/shared/zrpc/server";
import { registerRpcServer } from "@/server/shared/zrpc/server";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { AnyEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { RpcContext } from "@/shared/zrpc/core";

interface LogicServerContext extends SharedServerContext {
  eventIdPool: IdPoolGenerator;
  idGenerator: IdGenerator;
  logicServer: LogicServer;
  askService?: AskService;
  eventHandlerMap: EventHandlerMap;
  serverMods: ServerMods;
  replica: Replica<LogicMetaIndex & AskMetaIndex>;
  rpcServer: ZrpcServer;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}

export async function registerLogicReplica<C extends LogicServerContext>(
  loader: RegistryLoader<C>
) {
  return new Replica("logic", await loader.get("worldApi"), {
    metaIndex: {
      ...createLogicIndexConfig(),
      ...(process.env.NODE_ENV !== "production"
        ? createAskIndexConfig()
        : undefined),
    },
  }) as Replica<LogicMetaIndex & AskMetaIndex>;
}

const stallCounter = createCounter({
  name: "logic_transaction_stalls",
  help: "Count of transactions that needed to be attempted again",
});

const abandonCounter = createCounter({
  name: "logic_transaction_abandons",
  help: "Count of transactions that were abandoned due to contention",
});

const logicProposals = createCounter({
  name: "logic_proposals",
  help: "Count of overall proposals via logic",
});

const logicAttempts = createCounter({
  name: "logic_attempts",
  help: "Count of overall logic batches",
});

class LogicHandler {
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly replica: Replica<LogicMetaIndex>,
    private readonly worldApi: WorldApi,
    private readonly idPool: IdPoolGenerator,
    private readonly handlers: EventHandlerMap
  ) {}

  // Attempt to process this batch, return remaining events that couldn't be handled.
  async attempt(
    lockScope: LockMapScope,
    eventsToPublish: AnyEvent[]
  ): Promise<[AnyEvent[], any]> {
    if (eventsToPublish.length === 0) {
      return [[], {}]; // Nothing to do.
    }

    const batchContext = new EventBatchContext(
      this.voxeloo,
      new LogicVersionedEntitySource(this.voxeloo, this.replica.table),
      secondsSinceEpoch()
    );
    const workByKind = groupByHandler(this.handlers, eventsToPublish);

    // Determine all the involved specs.
    const [todo] = batchContext.prepareAll(workByKind);
    if (todo.length === 0) {
      return [[], {}];
    }

    await lockScope.acquireAll(idsInTodo(batchContext, todo));

    const loan = new IdPoolLoan(this.idPool);
    const proposals = await batchContext.processEvents(loan, todo);

    if (proposals.length === 0) {
      return [[], {}];
    }

    logicProposals.inc(proposals.length);
    logicAttempts.inc();

    const transactions = proposals.map((p) => p.transaction);

    // Actually apply the transaction to the world.
    const { outcomes, changes: eagerChanges } = await this.worldApi.apply(
      transactions
    );

    const failedEvents: AnyEvent[] = [];
    const allUsedIds: BiomesId[] = [];
    for (let i = 0; i < proposals.length; ++i) {
      const { usedIds, handled } = proposals[i];
      if (outcomes[i] === "aborted") {
        failedEvents.push(...(handled as AnyEvent[]));
      } else {
        allUsedIds.push(...usedIds);
      }
    }
    if (loan.size > 0) {
      loan.commit(allUsedIds);
    }

    // The transaction response may include updates we can eagerly apply to
    // catch up faster than the sync protocol.
    this.replica?.localOnlyUpdate(
      eagerChanges.map((c) => materializeLazyChange(c))
    );

    return [
      failedEvents,
      {
        transactions,
        outcomes,
        eagerChanges,
        failedEvents,
      },
    ];
  }
}

class LogicServer implements LogicService {
  private readonly lockMap = new LockMap();

  constructor(
    private readonly replica: Replica<LogicMetaIndex>,
    private readonly handler: LogicHandler
  ) {}

  async start() {
    await this.replica?.start();
  }

  async stop() {
    await this.replica?.stop();
  }

  async ping() {}

  async publish(
    _context: RpcContext,
    { events: gameEvents }: PublishRequest
  ): Promise<PublishResponse> {
    let eventsToPublish: any[] = gameEvents.map((e) => e.event);
    const outcomes = gameEvents.map(() => true);
    const initialCount = eventsToPublish.length;
    const attemptLog: any[] = [];

    const success = await this.lockMap.useLocks(async (scope) => {
      for (let i = 0; i < CONFIG.logicTransactionAttempts; ++i) {
        let attemptLogItem!: any;
        [eventsToPublish, attemptLogItem] = await this.handler.attempt(
          scope,
          eventsToPublish
        );
        if (eventsToPublish.length === 0) {
          return true;
        }
        attemptLog.push(attemptLogItem);
        stallCounter.inc();
      }
    });
    if (success) {
      return { outcomes };
    }
    abandonCounter.inc();
    log.warn("Logic tier aborting event handling due to contention", {
      eventsToPublish,
      attemptLog,
      succeeded: initialCount - eventsToPublish.length,
    });
    const failedSet = new Set(eventsToPublish);
    for (let i = 0; i < outcomes.length; ++i) {
      if (failedSet.has(gameEvents[i].event)) {
        outcomes[i] = false;
      }
    }
    return { outcomes };
  }
}

async function registerLogicServer<C extends LogicServerContext>(
  loader: RegistryLoader<C>
) {
  const [voxeloo, replica, worldApi, eventIdPool, eventHandlerMap] =
    await Promise.all([
      loader.get("voxeloo"),
      loader.get("replica"),
      loader.get("worldApi"),
      loader.get("eventIdPool"),
      loader.get("eventHandlerMap"),
    ]);
  const handler = new LogicHandler(
    voxeloo,
    replica,
    worldApi,
    eventIdPool,
    eventHandlerMap
  );
  return new LogicServer(replica, handler);
}

async function registerAskServiceInLogic<C extends LogicServerContext>(
  loader: RegistryLoader<C>
) {
  const [replica, rpcServer] = await Promise.all([
    loader.get("replica"),
    loader.get("rpcServer"),
  ]);
  if (replica) {
    const service = new AskServiceImpl(replica.table);
    rpcServer.install(zAskService, service);
    return service;
  }
}

void runServer(
  "logic",
  (signal) =>
    new RegistryBuilder<LogicServerContext>()
      .install(sharedServerContext)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("idGenerator", registerIdGenerator)
      .bind("eventIdPool", registerEventIdPool)
      .bind("eventHandlerMap", registerEventHandlerMap)
      .bind("logicServer", registerLogicServer)
      .bind("askService", registerAskServiceInLogic)
      .bind("replica", registerLogicReplica)
      .bind("serverMods", registerServerMods)
      .bind("rpcServer", () => registerRpcServer())
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.logicServer.start();
    context.rpcServer.install(zLogicService, context.logicServer);
    await context.rpcServer.start(HostPort.rpcPort);
    return {
      readyHook: async () => context.worldApi.healthy(),
    };
  }
);

import {
  connectToK8,
  getServiceEndpoints,
  isRunningOnKubernetes,
} from "@/server/shared/k8";
import { generateNonce } from "@/server/shared/nonce";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import {
  hasLoadedLua,
  loadAllLuaScripts,
  type BiomesLuaRedis,
} from "@/server/shared/world/lua/api";
import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { sleep } from "@/shared/util/async";
import { mapMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import { random } from "lodash";

function customizeForBiomes(redis: Redis): BiomesRedisConnection {
  redis.on("error", (error) => {
    if (!process.env.MOCHA_TEST) {
      log.error("Redis connection error", { error });
    }
  });
  const originalQuit = redis.quit.bind(redis);
  const originalDisconnect = redis.disconnect.bind(redis);
  const result = redis as unknown as BiomesRedisConnection;
  result.quit = async (reason?: string) => {
    log.warn("Redis quit", { reason });
    await originalQuit();
  };
  result.disconnect = (reason?: string) => {
    log.warn("Redis disconnect", { reason });
    originalDisconnect();
  };
  return result;
}

export interface BaseConnectionSpec {
  options?: RedisOptions;
}

export interface UnixSocketConnectionSpec extends BaseConnectionSpec {
  kind: "socket";
  path: string;
}

export interface TcpConnectionSpec extends BaseConnectionSpec {
  kind: "tcp";
  host: string;
  port: number;
}

export interface K8ConnectionSpec extends BaseConnectionSpec {
  kind: "k8";
  service: string;
}

export type RedisConnectionSpec =
  | UnixSocketConnectionSpec
  | TcpConnectionSpec
  | K8ConnectionSpec;

export const BASE_REDIS_OPTIONS: RedisOptions = {
  keepAlive: 5000 as any,
  autoResubscribe: false,
  autoResendUnfulfilledCommands: true,
  lazyConnect: true,
  connectTimeout: 15_000,
};

const READONLY_REDIS_OPTIONS: RedisOptions = {
  ...BASE_REDIS_OPTIONS,
  readOnly: true,
};

// The main global of instance we have.
const K8_PRIMARY_REDIS: RedisConnectionSpec = {
  kind: "tcp",
  host: "redis",
  port: 6379,
  options: BASE_REDIS_OPTIONS,
};

const K8_L1_REDIS: RedisConnectionSpec = {
  kind: "k8",
  service: "redis-l1",
  options: READONLY_REDIS_OPTIONS,
};

const K8_OTHER_REDIS: RedisConnectionSpec = {
  kind: "tcp",
  host: "redis-other",
  port: 6379,
  options: BASE_REDIS_OPTIONS,
};

const K8_HFC_REDIS: RedisConnectionSpec = {
  kind: "tcp",
  host: "redis-hfc",
  port: 6379,
  options: BASE_REDIS_OPTIONS,
};

const LOCAL_REDIS: RedisConnectionSpec = {
  kind: "tcp",
  host: "127.0.0.1",
  port: process.env.LOCAL_REDIS_PORT
    ? parseInt(process.env.LOCAL_REDIS_PORT)
    : 6379,
  options: BASE_REDIS_OPTIONS,
};

async function determineK8Endpoints(
  service: string,
  options?: RedisOptions
): Promise<TcpConnectionSpec[]> {
  const endpoints = await getServiceEndpoints(connectToK8(), service);
  const output: TcpConnectionSpec[] = [];
  for (const endpoint of endpoints) {
    for (const port of endpoint.ports) {
      if (port.name === "redis") {
        output.push({
          kind: "tcp",
          host: endpoint.hostname || endpoint.ip,
          port: port.port,
          options,
        });
      }
    }
  }
  return output;
}

class ActiveConnection<
  TConn extends BiomesRedisConnection = BiomesRedisConnection
> {
  private readonly controller = new BackgroundTaskController();
  private readonly endpoints = new Map<
    number,
    Promise<ActiveConnection<TConn>>
  >();
  private endpointSpecs?: TcpConnectionSpec[];

  constructor(
    public readonly spec: RedisConnectionSpec,
    public readonly conn: TConn
  ) {
    this.controller.runInBackground("refresh-endpoints", (signal) =>
      this.periodicallyRefreshEndpointSpecs(signal)
    );
  }

  async loadAllLuaScripts() {
    await loadAllLuaScripts(this.conn);
    return this as unknown as ActiveConnection<BiomesLuaRedis>;
  }

  private async clearEndpoints(
    f: (c: ActiveConnection<TConn>) => Promise<void>
  ) {
    const p = Promise.allSettled(
      mapMap(this.endpoints, (c) => c.then((c) => f(c)))
    );
    this.endpoints.clear();
    this.endpointSpecs = undefined;
    await p;
  }

  async quit(reason: string) {
    await this.conn.quit(reason);
    await this.clearEndpoints((c) => c.quit(reason));
    this.controller.abort();
  }

  async disconnect(reason: string) {
    this.conn.disconnect(reason);
    await this.clearEndpoints((c) => c.disconnect(reason));
    this.controller.abort();
  }

  private async periodicallyRefreshEndpointSpecs(signal: AbortSignal) {
    if (this.spec.kind !== "k8") {
      return;
    }
    while (await sleep(CONFIG.redisRefreshK8EndpointsMs, signal)) {
      try {
        this.endpointSpecs = await determineK8Endpoints(this.spec.service);
      } catch (error) {
        log.error("Failed to update endpoints", { error });
      }
    }
  }

  async pin(): Promise<TConn> {
    if (this.spec.kind !== "k8" || process.env.USE_K8_REDIS !== "1") {
      return this.conn;
    }
    if (!this.endpointSpecs) {
      // Block on an immediate refresh.
      this.endpointSpecs = await determineK8Endpoints(this.spec.service);
    }
    ok(this.endpointSpecs.length > 0, "No endpoints found for service");
    const idx = random(0, this.endpointSpecs.length - 1);
    const existing = this.endpoints.get(idx);
    if (existing) {
      return (await existing).conn;
    }
    // Not yet connected to this endpoint, do it now.
    const pin = (async () => {
      ok(this.endpointSpecs, "No endpoints found for service");
      const active = await openConnection(this.endpointSpecs[idx]);
      if (hasLoadedLua(this.conn)) {
        return active.loadAllLuaScripts();
      }
      await active.conn.ping();
      return active;
    })().catch((error) => {
      log.error("Failed to pin connection", { error });
      // If we were the one cached, clear that out.
      if (this.endpoints.get(idx) === pin) {
        this.endpoints.delete(idx);
      }
      throw error;
    }) as unknown as Promise<ActiveConnection<TConn>>;
    this.endpoints.set(idx, pin);
    return (await pin).conn;
  }
}

async function openConnection(
  spec: RedisConnectionSpec,
  additionalOptions: RedisOptions = {}
): Promise<ActiveConnection> {
  if (
    !isRunningOnKubernetes() &&
    (spec.kind !== "tcp" || spec.host !== "127.0.0.1")
  ) {
    // Force all unexpected connections to localhost.
    return openConnection(LOCAL_REDIS, additionalOptions);
  }
  const options = {
    ...spec.options,
    ...additionalOptions,
    connectionName: generateNonce(),
  };
  let redis!: Redis;
  switch (spec.kind) {
    case "socket":
      redis = new Redis(spec.path, options);
      break;
    case "tcp":
      redis = new Redis(spec.port, spec.host, options);
      break;
    case "k8":
      redis = new Redis(6379, spec.service, options);
      break;
    default:
      assertNever(spec);
  }
  return new ActiveConnection(spec, customizeForBiomes(redis));
}

export interface RedisSchema {
  db: number;
  conn: RedisConnectionSpec;
  replica?: RedisConnectionSpec;
}

const PROD_RC_REDIS: RedisSchema = {
  db: 0,
  conn: K8_PRIMARY_REDIS,
  replica: K8_L1_REDIS,
};

export const REDIS_SCHEMA = {
  ecs: PROD_RC_REDIS,
  firehose: PROD_RC_REDIS,
  grafana: {
    db: 1,
    conn: K8_OTHER_REDIS,
  },
  cache: {
    db: 2,
    conn: K8_OTHER_REDIS,
  },
  bikkie: {
    db: 3,
    conn: K8_OTHER_REDIS,
  },
  "bikkie-cache": {
    db: 3,
    conn: K8_OTHER_REDIS,
  },
  chat: {
    db: 4,
    conn: K8_OTHER_REDIS,
  },
  "ecs-hfc": {
    db: 5,
    conn: K8_HFC_REDIS,
  },
  "shard-manager": {
    db: 6,
    conn: K8_OTHER_REDIS,
  },
  pubsub: {
    db: 6, // Note, shared with shard-manager
    conn: K8_OTHER_REDIS,
  },
  election: {
    db: 6, // Note, shared with shard-manager
    conn: K8_OTHER_REDIS,
  },
  "service-discovery": {
    db: 6, // Note, shared with shard-manager
    conn: K8_OTHER_REDIS,
  },
} as const;

export type RedisPurpose = keyof typeof REDIS_SCHEMA;

function duplicateRedis(
  redis: BiomesRedisConnection,
  additionalOptions: RedisOptions = {}
) {
  const duplicate = redis.duplicate({
    ...additionalOptions,
    connectionName: generateNonce(),
  });
  return customizeForBiomes(duplicate);
}

export class BiomesRedis<
  TConn extends BiomesRedisConnection = BiomesRedisConnection
> {
  readonly #primary: ActiveConnection<TConn>;
  readonly #replica?: ActiveConnection<TConn>;

  constructor(
    primary: ActiveConnection<TConn>,
    replica?: ActiveConnection<TConn>
  ) {
    this.#primary = primary;
    this.#replica = replica;
  }

  get primary(): TConn {
    return this.#primary.conn;
  }

  get replica(): TConn {
    return (this.#replica ?? this.#primary).conn;
  }

  pinReplica(): Promise<TConn> {
    return (this.#replica ?? this.#primary).pin();
  }

  // Duplicate the replica connection to suit a subscription-mode change.
  // When a redis connection is in subscription mode (e.g. for pubsub) it
  // cannot be used for other purposes.
  createSubscriptionConnection() {
    return duplicateRedis(this.replica);
  }

  private async forEach<R>(
    f: (conn: ActiveConnection<TConn>) => Promise<R>
  ): Promise<R[]> {
    const work = [f(this.#primary)];
    if (this.#replica) {
      work.push(f(this.#replica));
    }
    return Promise.all(work);
  }

  async loadLua() {
    await this.forEach((c) => c.loadAllLuaScripts());
    return this as unknown as BiomesRedis<BiomesLuaRedis>;
  }

  async ping(): Promise<boolean> {
    return (await this.forEach((c) => c.conn.ping())).every(
      (pong) => pong === "PONG"
    );
  }

  async quit(reason: string) {
    await this.#replica?.disconnect(reason);
    await this.#primary.quit(reason);
  }
}

export async function connectToRedis(
  purpose: RedisPurpose | RedisSchema
): Promise<BiomesRedis> {
  let redis!: BiomesRedis;
  const schema =
    typeof purpose === "string"
      ? (REDIS_SCHEMA[purpose] as RedisSchema)
      : purpose;
  const options = { db: schema.db };
  if (schema.replica) {
    const [primary, replica] = await Promise.all([
      openConnection(schema.conn, options),
      openConnection(schema.replica, options),
    ]);
    redis = new BiomesRedis(primary, replica);
  } else {
    redis = new BiomesRedis(await openConnection(schema.conn, options));
  }
  await redis.ping();
  return redis;
}

export async function connectToRedisWithLua(purpose: RedisPurpose) {
  return (await connectToRedis(purpose)).loadLua();
}

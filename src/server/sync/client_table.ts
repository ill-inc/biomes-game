import type { ClientId } from "@/server/sync/client";
import { Client } from "@/server/sync/client";
import type { SyncServerContext } from "@/server/sync/context";
import type { CrossClientEventBatcher } from "@/server/sync/events/cross_client";
import { BackgroundTaskController } from "@/shared/abort";
import { log } from "@/shared/logging";
import { createGauge } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import { mapMap, removeValue } from "@/shared/util/collections";
import { ok } from "assert";

export class ClientTable {
  private readonly clients = new Map<ClientId, Client>();
  private readonly controller = new BackgroundTaskController();

  constructor(
    private readonly createClientFn: (
      clientId: ClientId,
      gremlin: boolean
    ) => Client,
    private readonly crossClient: CrossClientEventBatcher
  ) {
    createGauge({
      name: "sync_active_clients",
      help: "Number of active clients",
      collect: (gauge) => {
        gauge.set(this.clients.size);
      },
    });
    createGauge({
      name: "sync_active_users",
      help: "Number of active users",
      collect: (gauge) => {
        gauge.set(this.getUserCounts().real);
      },
    });
    createGauge({
      name: "sync_active_gremlins",
      help: "Number of active non-internal (e.g. non-gremlin) users.",
      collect: (gauge) => {
        gauge.set(this.getUserCounts().gremlin);
      },
    });
    createGauge({
      name: "sync_pending_changes",
      help: "Number of pending changes overall",
      collect: (gauge) => {
        gauge.set(
          [...this.clients.values()].reduce(
            (acc, client) => acc + client.pendingChanges,
            0
          )
        );
      },
    });
    createGauge({
      name: "sync_resident_set",
      help: "Number of items in all resident sets combined",
      collect: (gauge) => {
        gauge.set(
          [...this.clients.values()].reduce(
            (acc, client) => acc + client.residentSetSize,
            0
          )
        );
      },
    });
  }

  start() {
    this.controller.runInBackground("gcClients", (signal) =>
      this.periodicallyGcClients(signal)
    );
    this.controller.runInBackground("drainEvents", (signal) =>
      this.periodicallyFlushEvents(signal)
    );
  }

  [Symbol.iterator]() {
    return this.clients.values();
  }

  private async periodicallyGcClients(signal: AbortSignal) {
    while (await sleep(CONFIG.syncClientGcIntervalMs, signal)) {
      const toDelete: ClientId[] = [];
      for (const [id, client] of this.clients) {
        if (client.shouldGc) {
          toDelete.push(id);
        }
      }
      await Promise.all(toDelete.map((id) => this.delete(id)));
    }
  }

  private async periodicallyFlushEvents(signal: AbortSignal) {
    const work: Promise<unknown>[] = [];
    while (await sleep(1000 / CONFIG.syncClientEventHz, signal)) {
      const flush = this.flush();
      work.push(flush);
      flush.finally(() => removeValue(work, flush));
    }
    await Promise.all(work);
  }

  private async flush() {
    // Flush out events per-client for one tick
    for (const client of this.clients.values()) {
      client.flush();
    }
    // Flush out all events we got.
    await this.crossClient.drain();
  }

  async dump() {
    return {
      num_clients: this.clients.size,
      clients: Object.fromEntries(
        mapMap(this.clients, (value, id) => [id, value.dump()])
      ),
    };
  }

  create(clientId: ClientId, gremlin: boolean) {
    log.info(`Creating client: ${clientId}`, {
      clientId,
      gremlin,
    });
    ok(!this.clients.has(clientId));
    const client = this.createClientFn(clientId, gremlin);
    this.clients.set(clientId, client);
    return client;
  }

  byId(userId: ClientId): Client | undefined {
    const client = this.clients.get(userId);
    if (client) {
      client.lastUsed.reset();
      return client;
    }
  }

  getOrCreate(userId: ClientId, gremlin: boolean) {
    return this.byId(userId) ?? this.create(userId, gremlin);
  }

  private async delete(id: ClientId) {
    const client = this.clients.get(id);
    if (!client || !client.shouldGc) {
      return;
    }
    log.info(`Deleting client: ${id}`);
    this.clients.delete(id);
    await client.stop();
  }

  async stop() {
    // Stop any periodic work.
    await this.controller.abortAndWait();

    // Delete all clients.
    await Promise.all([...this.clients.keys()].map((id) => this.delete(id)));

    // Flush out any remaining events.
    await this.flush();
  }

  private getUserCounts(): { real: number; gremlin: number } {
    const users = new Set<ClientId>();
    let real = 0;
    let gremlin = 0;
    for (const client of this.clients.values()) {
      if (users.has(client.clientId)) {
        continue;
      }
      users.add(client.clientId);
      if (client.gremlin) {
        gremlin++;
      } else {
        real++;
      }
    }
    return { real, gremlin };
  }
}

export async function registerClients<C extends SyncServerContext>(
  loader: RegistryLoader<C>
) {
  return new ClientTable(
    loader.provide(
      (ctx: SyncServerContext, clientId: ClientId, gremlin: boolean) =>
        new Client(ctx, clientId, gremlin)
    ),
    await loader.get("crossClientEventBatcher")
  );
}

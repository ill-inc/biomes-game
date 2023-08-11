import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { registerDiscordBot, type DiscordBot } from "@/server/shared/discord";
import type { Firehose } from "@/server/shared/firehose/api";
import { registerFirehose } from "@/server/shared/firehose/register";
import { getGitEmail } from "@/server/shared/git";
import { runServer } from "@/server/shared/main";
import type { WorldApi } from "@/server/shared/world/api";
import { HybridWorldApi } from "@/server/shared/world/hfc/hybrid";
import { registerWorldApi } from "@/server/shared/world/register";
import { batchedGet, readWorldChanges } from "@/server/shared/world/util";
import type { BigQueryConnection } from "@/server/web/bigquery";
import { registerBigQueryClient } from "@/server/web/bigquery";
import { BackgroundTaskController } from "@/shared/abort";
import { getBiscuits } from "@/shared/bikkie/active";
import { biscuitToJson } from "@/shared/bikkie/schema/attributes";
import type { ProposedChange } from "@/shared/ecs/change";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { RegistryBuilder } from "@/shared/registry";
import { TokenBucket, sleep } from "@/shared/util/async";
import { isSuperset } from "@/shared/util/collections";
import { ok } from "assert";
import { chunk } from "lodash";

export interface SinkServerContext extends SharedServerContext {
  bigQuery: BigQueryConnection;
  discordBot: DiscordBot;
  firehose: Firehose;
  worldApi: WorldApi;
}

async function createSubscriptionName() {
  if (process.env.NODE_ENV !== "production") {
    // When running locally use a user-specific subscription name.
    return `${await getGitEmail()}-sink`;
  }
  return `sink`;
}

async function tailFirehoseToBigQuery(
  { bigQuery, firehose }: SinkServerContext,
  signal: AbortSignal
) {
  const table = bigQuery.getTable({
    datasetName: "prod",
    tableName: "firehose",
  });
  for await (const [events, ack] of firehose.events(
    await createSubscriptionName(),
    5000,
    signal
  )) {
    try {
      for (const event of events) {
        table.insert({
          timestamp: event.timestamp / 1000,
          userId: event.entityId,
          json: event,
        });
      }
      await ack();
    } catch (error) {
      log.fatal("Failed to process events", { error });
    }
  }
}

async function updateDiscordRolesFromLeaderboard({
  worldApi,
  discordBot,
}: SinkServerContext) {
  const leaderboard = worldApi.leaderboard();
  const ignore = new Set<BiomesId>(CONFIG.leaderboardToDiscordIgnoreUsers);
  for (const [category, count, role] of CONFIG.leaderboardToDiscordSync) {
    if (!role) {
      continue;
    }
    const targetMembers = new Set<BiomesId>();
    if (count > 0) {
      const entries = await leaderboard.get(
        category,
        "thisWeek",
        "DESC",
        ignore.size + count
      );
      for (const { id } of entries) {
        if (ignore.has(id)) {
          continue;
        }
        targetMembers.add(id);
        if (targetMembers.size === count) {
          break;
        }
      }
    }
    await discordBot.setRoleMembers(role, targetMembers);
  }
}

async function copyHfcToPrimary(
  { worldApi }: SinkServerContext,
  signal: AbortSignal
) {
  if (!(worldApi instanceof HybridWorldApi)) {
    return;
  }
  // Get all HFC entities.
  const changes = await readWorldChanges(worldApi.hfc, signal);
  if (!changes.length) {
    // Aborted.
    return;
  }
  // Get all the RC entities for these HFC changes.
  const primaries = await batchedGet(
    worldApi.rc,
    changes.map((c) => c.entity.id),
    signal
  );
  if (!primaries.length) {
    // Aborted.
    return;
  }
  ok(primaries.length === changes.length);

  // Determine updates needed to both worlds.
  const hfcChanges: ProposedChange[] = [];
  const rcChanges: ProposedChange[] = [];
  for (const [idx, change] of changes.entries()) {
    const id = change.entity.id;
    const primary = primaries[idx];

    if (!primary) {
      // It doesn't exist any more, delete from HFC.
      hfcChanges.push({ kind: "delete", id });
    } else if (
      isSuperset(
        change.entity.allReferencedComponents(),
        primary.allReferencedComponents()
      )
    ) {
      // It's solely defined by HFC components, delete it.
      rcChanges.push({ kind: "delete", id });
      hfcChanges.push({ kind: "delete", id });
    } else {
      // It's a real entity, update it.
      rcChanges.push({ kind: "update", entity: change.entity.materialize() });
    }
  }
  // Apply the changes we've detected between the two worlds.
  const bucket = new TokenBucket(CONFIG.sinkHfcMirrorChangeQps);
  for (const batch of chunk(hfcChanges, CONFIG.sinkHfcMirrorBatchSize)) {
    if (await bucket.consume(batch.length, signal)) {
      await worldApi.hfc.apply({ changes: batch });
      continue;
    }
    break; // Aborted.
  }
  for (const batch of chunk(rcChanges, CONFIG.sinkHfcMirrorBatchSize)) {
    if (await bucket.consume(batch.length, signal)) {
      await worldApi.rc.apply({ changes: batch });
      continue;
    }
    break; // Aborted.
  }
}

async function dumpBikkieToBigQuery({ bigQuery }: SinkServerContext) {
  const table = bigQuery.getTable({
    datasetName: "prod",
    tableName: "bikkie",
  });
  const timestamp = Date.now() / 1000.0;
  for (const biscuit of getBiscuits()) {
    table.insert({
      timestamp,
      json: biscuitToJson(biscuit),
    });
  }
}

void runServer(
  "sink",
  (signal) =>
    new RegistryBuilder<SinkServerContext>()
      .install(sharedServerContext)
      .bind("bigQuery", registerBigQueryClient)
      .bind("discordBot", registerDiscordBot)
      .bind("firehose", registerFirehose)
      .bind("worldApi", registerWorldApi({ signal }))
      .build(),
  async (context) => {
    const controller = new BackgroundTaskController();
    controller.runInBackground("tail", (signal) =>
      tailFirehoseToBigQuery(context, signal)
    );
    controller.runInBackground("hfc-mirror", async (signal) => {
      while (await sleep(CONFIG.sinkHfcMirrorIntervalMs, signal)) {
        try {
          await copyHfcToPrimary(context, signal);
        } catch (error) {
          log.error("Error mirroring HFC to RC", { error });
        }
      }
    });
    controller.runInBackground("discord-roles", async (signal) => {
      while (await sleep(CONFIG.sinkDiscordRoleIntervalMs, signal)) {
        try {
          await updateDiscordRolesFromLeaderboard(context);
        } catch (error) {
          log.error("Error updating Discord roles", { error });
        }
      }
    });
    controller.runInBackground("bikkie", async (signal) => {
      while (await sleep(CONFIG.sinkBikkieIntervalMs, signal)) {
        try {
          await dumpBikkieToBigQuery(context);
        } catch (error) {
          log.error("Error dumping bikkie to BigQuery", { error });
        }
      }
    });
    return {
      shutdownHook: () => controller.abortAndWait(),
    };
  }
);

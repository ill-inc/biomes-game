import type {
  Firehose,
  IdempotentFirehoseEvent,
} from "@/server/shared/firehose/api";
import { getGitEmail } from "@/server/shared/git";
import type { LazyReplica } from "@/server/shared/replica/lazy_table";
import type { TriggerEngine } from "@/server/shared/triggers/engine";
import { QuestExecutor } from "@/server/shared/triggers/roots/quest";
import { RecipeExecutor } from "@/server/shared/triggers/roots/recipe";
import type { RootExecutor } from "@/server/shared/triggers/roots/root";
import type { ExpiryProcessor } from "@/server/trigger/expiry";
import type { TriggerServerContext } from "@/server/trigger/main";
import { BackgroundTaskController } from "@/shared/abort";
import { bikkieDerived } from "@/shared/bikkie/active";
import type { BiomesId } from "@/shared/ids";
import { log, withLogContext } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import { MultiMap } from "@/shared/util/collections";
import { BackoffDelay } from "@/shared/util/retry_helpers";
import { compact } from "lodash";

async function createSubscriptionName() {
  if (process.env.NODE_ENV !== "production") {
    // When running locally use a user-specific subscription name.
    return `${await getGitEmail()}-trigger-server`;
  }
  return `trigger-server`;
}

const processedEventBatches = createCounter({
  name: "trigger_processed_event_batches",
  help: "Number of events processed by the trigger server",
});

const processedEventBatchErrors = createCounter({
  name: "trigger_processed_event_batch_errors",
  help: "Number of events processed by the trigger server",
});

const processedEventBatchMs = createCounter({
  name: "trigger_processed_event_batch_ms",
  help: "Time spent processing events (ms)",
});

const processedEvents = createCounter({
  name: "trigger_processed_events",
  help: "Number of events processed by the trigger server",
});

export class TriggerServer {
  private readonly controller = new BackgroundTaskController();
  private allExecutors: () => RootExecutor[];

  constructor(
    private readonly firehose: Firehose,
    private readonly replica: LazyReplica,
    private readonly engine: TriggerEngine,
    private readonly expiryProcessor: ExpiryProcessor
  ) {
    this.allExecutors = bikkieDerived(
      "allExecutors",
      (runtime) =>
        compact([
          ...runtime.getBiscuits("/recipes").map(RecipeExecutor.fromBiscuit),
          ...runtime.getBiscuits("/quests").map(QuestExecutor.fromBiscuit),
        ]) as RootExecutor[]
    );
  }

  async start() {
    await this.replica.start();
    this.controller.runInBackground("process-triggers", (signal) =>
      this.run(signal)
    );
    this.controller.runInBackground("run-expiry", (signal) =>
      this.expiryProcessor.run(signal)
    );
  }

  private async run(signal: AbortSignal) {
    const backoff = new BackoffDelay(() => ({
      baseMs: CONFIG.triggerRetryDelayMs,
      maxMs: CONFIG.triggerRetryDelayMs * 10,
    }));
    while (await backoff.wait(signal)) {
      try {
        for await (const [events, ack] of this.firehose.events(
          await createSubscriptionName(),
          5000,
          signal
        )) {
          const timer = new Timer();
          processedEventBatches.inc();
          try {
            await this.handleBatch(events);
            processedEvents.inc(events.length);
          } catch (error) {
            log.error("Error while handling batch of events", { error });
            processedEventBatchErrors.inc();
            throw error;
          } finally {
            processedEventBatchMs.inc(timer.elapsed);
          }
          await ack();
          backoff.reset(); // Did one batch successfully.
          if (!(await sleep(CONFIG.triggerBatchWindowMs, signal))) {
            break;
          }
        }
      } catch (error) {
        log.error("Trigger error processing events, will retry.", {
          error,
        });
      }
    }
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.replica.stop();
  }

  private async handleBatch(events: ReadonlyArray<IdempotentFirehoseEvent>) {
    const executors = this.allExecutors();
    const eventsByEntity = new MultiMap<BiomesId, IdempotentFirehoseEvent>();
    for (const event of events) {
      eventsByEntity.add(event.entityId, event);
    }
    const results = await Promise.allSettled([
      ...eventsByEntity.map(([id, events]) =>
        withLogContext(
          {
            extra: { entityId: id },
          },
          async () => {
            try {
              await this.engine.process(id, executors, events);
            } catch (error: any) {
              log.error(`Error while handling triggers`, { error });
              throw error;
            }
          }
        )
      ),
    ]);
    for (const result of results) {
      if (result.status === "rejected") {
        throw result.reason;
      }
    }
  }
}

export async function registerTriggerServer<C extends TriggerServerContext>(
  loader: RegistryLoader<C>
) {
  const [firehose, triggerReplica, triggerEngine, expiryProcessor] =
    await Promise.all([
      loader.get("firehose"),
      loader.get("triggerReplica"),
      loader.get("triggerEngine"),
      loader.get("expiryProcessor"),
    ]);
  return new TriggerServer(
    firehose,
    triggerReplica,
    triggerEngine,
    expiryProcessor
  );
}

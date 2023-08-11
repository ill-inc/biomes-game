import type { WorldApi } from "@/server/shared/world/api";
import type { SideFxServerContext } from "@/server/sidefx/main";
import type { SideEffect } from "@/server/sidefx/side_effect_types";
import type { SideFxReplica } from "@/server/sidefx/table";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import { ChangeBuffer } from "@/shared/ecs/change";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";

const sideEffectChanges = createCounter({
  name: "sidefx_changes",
  help: "Number of World API change requests made by side effects",
  labelNames: ["name"],
});

const sideEffectFailedChanges = createCounter({
  name: "sidefx_failed_changes",
  help: "Number of failed World API change requests made by side effects",
  labelNames: ["name"],
});

export class SideFxServer {
  private readonly controller = new BackgroundTaskController();
  private readonly incomingChanges = new ChangeBuffer();

  constructor(
    private readonly replica: SideFxReplica,
    private readonly worldApi: WorldApi,
    private readonly sideEffects: SideEffect[]
  ) {}

  async start() {
    this.replica.apply = this.applyChanges;
    await this.replica.start();

    this.controller.runInBackground("flush", (signal) => this.flush(signal));
  }

  private applyChanges = (changes: Change[]) => {
    this.incomingChanges.push(changes);
  };

  async flush(signal: AbortSignal) {
    let previousApplySucceeded = true;
    while (await sleep(1000 / CONFIG.sidefxFlushHz, signal)) {
      if (this.incomingChanges.empty && previousApplySucceeded) {
        continue;
      }

      const changes = this.incomingChanges.pop();

      for (const sideEffect of this.sideEffects) {
        sideEffect.preApply?.(changes);
      }

      this.replica.table.apply(changes);

      const outgoingChangesPromises = await Promise.all(
        this.sideEffects.map(async (sideEffect) => ({
          name: sideEffect.name,
          outgoingChanges: await sideEffect.postApply(changes),
        }))
      );

      previousApplySucceeded = true;
      await Promise.allSettled(
        outgoingChangesPromises.map(async ({ name, outgoingChanges }) => {
          const allSucceeded = await this.applyOutgoingChanges(
            name,
            outgoingChanges
          );
          if (!allSucceeded) {
            previousApplySucceeded = false;
          }
        })
      );
    }
  }

  private async applyOutgoingChanges(
    sideEffectName: string,
    outgoingChanges: ChangeToApply[]
  ): Promise<boolean> {
    if (outgoingChanges.length > 0) {
      try {
        sideEffectChanges.inc({ name: sideEffectName }, outgoingChanges.length);
        const results = await this.worldApi.apply(outgoingChanges);
        const numErrors = results.outcomes.filter(
          (x) => x === "aborted"
        ).length;
        if (numErrors > 0) {
          sideEffectFailedChanges.inc({ name: sideEffectName }, numErrors);
          return false;
        }
      } catch (error) {
        sideEffectFailedChanges.inc(
          { name: sideEffectName },
          outgoingChanges.length
        );
        log.throttledError(
          100,
          `Failed to apply all side effect changes for side effect: `,
          {
            changeCount: outgoingChanges.length,
            sideEffectName,
            error,
          }
        );
        return false;
      }
    }
    return true;
  }

  async stop() {
    await this.controller.abortAndWait();
    await this.replica.stop();
  }
}

export async function registerSideFxServer<C extends SideFxServerContext>(
  loader: RegistryLoader<C>
) {
  return new SideFxServer(
    ...(await Promise.all([
      loader.get("sideFxReplica"),
      loader.get("worldApi"),
      loader.get("sideEffects"),
    ]))
  );
}

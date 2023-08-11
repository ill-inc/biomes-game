import type { TriggerContext } from "@/server/shared/triggers/core";
import type { BiomesId } from "@/shared/ids";

export abstract class RootExecutor {
  constructor(public readonly id: BiomesId) {}
  abstract run(context: TriggerContext): void;
}

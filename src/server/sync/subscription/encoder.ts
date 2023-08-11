import type { SyncChange, SyncEcsDelta } from "@/shared/api/sync";
import { WrappedSyncChange } from "@/shared/api/sync";
import type { SerializeTarget } from "@/shared/ecs/gen/json_serde";
import { ChangeSerde } from "@/shared/ecs/serde";
import type { BiomesId } from "@/shared/ids";

export class WrappedSyncChangeFor extends WrappedSyncChange {
  constructor(private readonly target: SerializeTarget, change: SyncChange) {
    super(change);
  }

  public override prepareForZrpc() {
    if (typeof this.change === "number") {
      return this.change;
    }
    return ChangeSerde.serialize(this.target, this.change);
  }
}

export class ZrpcEncoder {
  private readonly target: SerializeTarget;

  constructor(userId: BiomesId) {
    this.target = {
      whoFor: "client",
      id: userId,
    };
  }

  encode(changes: SyncChange[]): SyncEcsDelta {
    return changes.map(
      (change) => new WrappedSyncChangeFor(this.target, change)
    );
  }
}

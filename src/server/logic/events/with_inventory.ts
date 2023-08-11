import { Specialized } from "@/server/logic/events/specialized";
import { ContainerInventoryEditor } from "@/server/logic/inventory/container_inventory_editor";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { WearingInventoryEditor } from "@/server/logic/inventory/wearing_inventory_editor";
import type { Delta, DeltaPatch } from "@/shared/ecs/gen/delta";
import type { FirehoseEvent } from "@/shared/firehose/events";

export type InventoryEditor =
  | PlayerInventoryEditor
  | ContainerInventoryEditor
  | WearingInventoryEditor;

export class WithInventory<
  T extends InventoryEditor = InventoryEditor
> extends Specialized {
  protected constructor(
    fork: DeltaPatch,
    public readonly inventory: T,
    events: FirehoseEvent[] = []
  ) {
    super(fork, events);
  }

  static for(fork: DeltaPatch) {
    if (fork.has("container_inventory")) {
      return new WithInventory(fork, new ContainerInventoryEditor(fork));
    } else if (fork.has("remote_connection")) {
      const events: FirehoseEvent[] = [];
      return new WithInventory(
        fork,
        new PlayerInventoryEditor(
          {
            publish: (event) => events.push(event),
          },
          fork
        ),
        events
      );
    } else if (fork.has("wearing")) {
      return new WithInventory(fork, new WearingInventoryEditor(fork));
    }
  }

  delta(): Delta {
    return this.fork;
  }
}

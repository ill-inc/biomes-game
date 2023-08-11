import { WithInventory } from "@/server/logic/events/with_inventory";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import type { DeltaPatch } from "@/shared/ecs/gen/delta";

export class Player extends WithInventory<PlayerInventoryEditor> {
  constructor(fork: DeltaPatch) {
    super(
      fork,
      new PlayerInventoryEditor(
        {
          publish: (event) => this.events.push(event),
        },
        fork
      )
    );
  }

  gremlin(): boolean {
    return !!this.fork.staleOk().gremlin();
  }

  position() {
    return this.fork.staleOk().position()?.v;
  }

  playerBehaviour() {
    return this.fork.playerBehavior();
  }

  mutablePlayerBehavior() {
    return this.fork.mutablePlayerBehavior();
  }

  teamId() {
    return this.fork.playerCurrentTeam()?.team_id;
  }

  roles() {
    return this.fork.userRoles()?.roles;
  }
}

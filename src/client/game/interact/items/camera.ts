import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";

// Camera item interactions are handled in react
export class CameraItemSpec implements AttackDestroyDelegateSpec {
  constructor(readonly deps: {}) {}
  onPrimaryDown() {
    return true;
  }
}

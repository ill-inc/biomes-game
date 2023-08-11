import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";

export interface SideEffect {
  name: string;

  // Called *before* the table is updated, so that the opportunity to access
  // entities about to be deleted is available. For convenience, the entity
  // the change applies to is passed in as well.
  preApply?(changes: Change[]): void;

  // Post-apply can assume that its changes will be applied and awaited before
  // being called again.
  postApply(changes: Change[]): Promise<ChangeToApply[]>;
}

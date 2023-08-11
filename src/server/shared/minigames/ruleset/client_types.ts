import type { ClientContextSubset } from "@/client/game/context";
import type { Tweaks } from "@/server/shared/minigames/ruleset/tweaks";
import type { RuleSetName } from "@/server/shared/minigames/ruleset/types";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { WarpHomeDestination } from "@/shared/firehose/events";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import type { CollisionCallback } from "@/shared/game/collision";
import type { Item } from "@/shared/game/item";
import type { ReadonlyVec3 } from "@/shared/math/types";

export type ClientRulesetHuds =
  | "challenges"
  | "minimap"
  | "nux"
  | "locationName";
export type ClientDeathRuleset =
  | {
      type: "modal";
    }
  | {
      type: "autospawn";
      destination: WarpHomeDestination;
    };

export type PlayerAttackCheck = (
  aclAllows: boolean,
  source: ReadonlyEntity,
  target: ReadonlyEntity
) => boolean;

export interface ClientRuleSet {
  name: RuleSetName;
  tweaks: Tweaks;
  death: ClientDeathRuleset;
  allowsBlockPickup: boolean;
  aclsForPosition: (position: ReadonlyVec3) => ReadonlyIndexedAcl[];
  disabledHuds?: ClientRulesetHuds[];
  flying: (deps: ClientContextSubset<"resources">) => boolean;
  playerCollisionFilter: CollisionCallback;
  canAttackPlayer: PlayerAttackCheck;
  canUseItem: (item?: Item) => boolean;
  canInspectPlayer: () => boolean;
  nameAugmentation: (player: ReadonlyEntity) => string | undefined;
  playerShowsAsObserver: (player: ReadonlyEntity) => boolean;
}

import type { RuleSetName } from "@/server/shared/minigames/ruleset/types";
import type { AclAction } from "@/shared/acl_types";
import type { ReadonlyDelta } from "@/shared/ecs/gen/delta";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { ReadonlyVec3 } from "@/shared/math/types";

export interface ServerRuleset {
  name: RuleSetName;

  overrideAcl: (
    action: AclAction,
    options?: {
      atPoints?: ReadonlyVec3[];
      entity?: ReadonlyDelta;
    }
  ) => boolean | undefined;
  canDropAt: (terrain: Terrain, wordPos: ReadonlyVec3) => boolean;
}

import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { isAclAction } from "@/shared/acl_types";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { Acl, AclAction } from "@/shared/ecs/gen/types";
import { AclPreset, aclPresets } from "@/shared/game/acls_base";
import { log } from "@/shared/logging";
import { mapIterable, mapMap } from "@/shared/util/collections";
import { some } from "lodash";

/*
 * Given actions, infer if a given ACL is using a preset by checcking if it
 * has all actions besides the given ones.
 * If it does, then we infer it was set to the preset before an action existed.
 * In that case, we update it to the current preset with the defined action.
 *
 * Example: After adding tillSoil and plantSeed to acl presets in
 * src/shared/game/acls.ts, run:
 * ./b script update_acls backupFile.json tillSoil plantSeed
 */

const [backupFile] = process.argv.slice(2, 3);
const newActionsStr = process.argv.slice(3);
const DRY_RUN = false;

// Check if actions are valid
for (const action of newActionsStr) {
  if (!isAclAction) {
    log.error(`Invalid action ${action}`);
    process.exit(1);
  }
}
if (newActionsStr.length === 0) {
  log.error("No actions specified");
  process.exit(1);
}
const newActions = newActionsStr as AclAction[];

function actionsMatchPresetExclusions(
  actions: ReadonlySet<AclAction>,
  excludedActions: AclAction[]
): AclPreset | undefined {
  let matchedPresets: AclPreset[] = [];
  for (const [preset, presetActions] of aclPresets) {
    const presetActionSet = new Set(presetActions);
    // Only match if the new preset has any new excluded actions.
    // Remove excluded actions from the preset for matching.
    let hasNewExcludedActions = false;
    excludedActions.map((action) => {
      hasNewExcludedActions =
        hasNewExcludedActions || presetActionSet.has(action);
      presetActionSet.delete(action);
    });
    // Check if the remaining actions from the preset match the given actions
    let match = true;
    for (const action of actions) {
      if (!presetActionSet.has(action)) {
        match = false;
        break;
      }
    }
    if (
      hasNewExcludedActions &&
      match &&
      presetActionSet.size === actions.size
    ) {
      matchedPresets.push(preset);
    }
  }
  if (matchedPresets.length > 1) {
    log.warn(
      `Found multiple matching presets for actions ${actions} and excluded actions ${excludedActions}: ${matchedPresets}`
    );
  }
  if (matchedPresets.length > 0) {
    return matchedPresets[0];
  }
}

function upgradeAclActions(actions: ReadonlySet<AclAction>): Set<AclAction> {
  const preset = actionsMatchPresetExclusions(actions, newActions);
  if (!preset) {
    return new Set(actions);
  }
  const presetActions = new Set(aclPresets.get(preset));
  return presetActions;
}

function actionsShouldUpgrade(
  actions: ReadonlySet<AclAction>,
  excludedActions: AclAction[]
): boolean {
  return actionsMatchPresetExclusions(actions, excludedActions) !== undefined;
}

function checkForUpgrade(e: ReadonlyEntity): boolean {
  const acl = e.acl_component?.acl;
  if (!acl) {
    return false;
  }
  return some([
    actionsShouldUpgrade(acl.everyone, newActions),
    ...mapIterable(acl.roles.values(), (actions) =>
      actionsShouldUpgrade(actions, newActions)
    ),
    ...mapIterable(acl.entities.values(), (actions) =>
      actionsShouldUpgrade(actions, newActions)
    ),
  ]);
}

function printAcl(acl: Acl) {
  log.info(`Everyone: ${[...acl.everyone]}`);
  log.info(
    `Roles: ${JSON.stringify(
      [...acl.roles.entries()].map(([role, actions]) => [role, [...actions]])
    )}`
  );
  log.info(
    `Entities: ${JSON.stringify(
      [...acl.entities.entries()].map(([entity, actions]) => [
        entity,
        [...actions],
      ])
    )}`
  );
}

function upgradeEntity(e: PatchableEntity): void {
  if (!checkForUpgrade(e.asReadonlyEntity())) {
    return;
  }
  const acl = e.aclComponent()?.acl;
  if (!acl) {
    return;
  }
  log.info(`Migrating ${e.id}`);
  const newAcl: Acl = {
    ...acl,
    everyone: upgradeAclActions(acl.everyone),
    roles: new Map(
      mapMap(acl.roles, (actions, role) => [role, upgradeAclActions(actions)])
    ),
    entities: new Map(
      mapMap(acl.entities, (actions, entity) => [
        entity,
        upgradeAclActions(actions),
      ])
    ),
    teams: new Map(
      mapMap(acl.teams, (actions, team) => [team, upgradeAclActions(actions)])
    ),
    creator: acl.creator
      ? [acl.creator[0], upgradeAclActions(acl.creator[1])]
      : undefined,
    creatorTeam: acl.creatorTeam
      ? [acl.creatorTeam[0], upgradeAclActions(acl.creatorTeam[1])]
      : undefined,
  };
  if (DRY_RUN) {
    printAcl(newAcl);
  } else {
    e.mutableAclComponent().acl = newAcl;
  }
}

migrateEntities(backupFile, checkForUpgrade, upgradeEntity);

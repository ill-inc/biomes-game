import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { ProjectsProtection } from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { anItem } from "@/shared/game/item";
import { projectsProtectionComponentsFromAttribute } from "@/shared/game/protection";
import { isEqual } from "lodash";

// Syncs the ACL settings from Bikkie into the instantiated
// entity projectsProtection components.

function getBiscuitForEntity(entity: PatchableEntity) {
  if (entity.npcMetadata()) {
    return anItem(entity.npcMetadata()!.type_id);
  } else if (entity.placeableComponent()) {
    return anItem(entity.placeableComponent()!.item_id);
  }
  return undefined;
}

function projectsProjectionDiffers(entity: PatchableEntity) {
  const projectsProtectionAttrib =
    getBiscuitForEntity(entity)?.projectsProtection;
  if (!projectsProtectionAttrib) {
    return false;
  }

  // Compute what a newly instantiated entity projects_protection component
  // would look like.
  const projectsComponents = projectsProtectionComponentsFromAttribute(
    projectsProtectionAttrib,
    entity.createdBy()?.id,
    entity.projectsProtection()?.timestamp ?? entity.createdBy()?.created_at
  );
  if (projectsComponents === undefined) {
    return false;
  }

  const oldVal = entity.projectsProtection();
  if (!oldVal) {
    return false;
  }
  const newVal = { ...oldVal };
  let modified = false;
  const bikkieProtection = projectsComponents.projects_protection.protection;
  if (!isEqual(bikkieProtection, oldVal.protection)) {
    newVal.protection = bikkieProtection;
    modified = true;
  }

  const bikkieRestoration = projectsComponents.projects_protection.restoration;
  if (!isEqual(bikkieRestoration, oldVal.restoration)) {
    newVal.restoration = bikkieRestoration;
    modified = true;
  }

  if (!modified) {
    return false;
  }

  entity.setProjectsProtection(ProjectsProtection.clone(newVal));

  return true;
}

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (entity) => projectsProjectionDiffers(new PatchableEntity(entity)),
  (entity) => {
    projectsProjectionDiffers(entity);
  }
);

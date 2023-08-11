import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { using } from "@/shared/deletable";
import { GroupComponent } from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { ReadonlyTensorBlob } from "@/shared/ecs/gen/types";
import { VoxelooModule } from "@/shared/wasm/types";

function getNewBlob(voxeloo: VoxelooModule, blob: ReadonlyTensorBlob) {
  return using(new voxeloo.GroupTensor(), (tensor) => {
    // Deserialization is backwards compatible.
    tensor.load(blob);
    // We serialize into the new format.
    return tensor.save();
  });
}

function checkForUpgrade(voxeloo: VoxelooModule, e: ReadonlyEntity): boolean {
  if (!e.group_component) {
    return false;
  }
  return (
    getNewBlob(voxeloo, e.group_component.tensor) !== e.group_component.tensor
  );
}

function upgradeEntity(voxeloo: VoxelooModule, e: PatchableEntity): void {
  if (!checkForUpgrade(voxeloo, e.asReadonlyEntity())) {
    return;
  }
  const groupComponent = e.groupComponent();
  if (!groupComponent) {
    return;
  }

  const oldTensorBlob = groupComponent.tensor;
  const newTensorBlob = getNewBlob(voxeloo, oldTensorBlob);

  e.setGroupComponent(
    GroupComponent.create({
      tensor: newTensorBlob,
    })
  );
}

const voxeloo = await loadVoxeloo();
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (e) => checkForUpgrade(voxeloo, e),
  (e) => upgradeEntity(voxeloo, e)
);

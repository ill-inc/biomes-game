import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import {
  DEFAULT_ROBOT_EXPIRATION_S,
  ROBOT_EXPIRATION_S,
} from "@/shared/constants";
import { secondsSinceEpoch } from "@/shared/ecs/config";

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.robot_component !== undefined &&
    entity.created_by !== undefined && // Not admin robot
    // Some field is missing.
    (!entity.robot_component.internal_battery_capacity ||
      !entity.robot_component.internal_battery_charge ||
      !entity.robot_component.last_update ||
      !entity.robot_component.trigger_at),
  (entity) => {
    const robot = entity.mutableRobotComponent();
    const timestamp = secondsSinceEpoch();
    if (!robot.internal_battery_capacity) {
      robot.internal_battery_capacity = ROBOT_EXPIRATION_S;
    }
    if (!robot.internal_battery_charge) {
      robot.internal_battery_charge = DEFAULT_ROBOT_EXPIRATION_S;
    }
    if (!robot.last_update) {
      robot.last_update = timestamp;
    }
    if (!robot.trigger_at) {
      robot.trigger_at = timestamp + DEFAULT_ROBOT_EXPIRATION_S;
    }
  }
);

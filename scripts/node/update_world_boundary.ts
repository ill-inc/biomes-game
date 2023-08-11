import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { ChangeToApply } from "@/shared/api/transaction";
import { promptToContinue } from "@/shared/batch/util";
import { WorldMetadataId } from "@/shared/ecs/ids";
import { log } from "@/shared/logging";
import { AABB } from "@/shared/wasm/types/biomes";

async function updateWorldBoundary(aabb?: AABB) {
  if (!aabb) {
    log.fatal(
      `Usage: node update_world_boundary.js "[[x0, y0, z0], [x1, y1, y2]]"`
    );
    return;
  }

  await bootstrapGlobalSecrets();

  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  const transactions: ChangeToApply[] = [
    {
      iffs: [[WorldMetadataId]],
      changes: [
        {
          kind: "update",
          entity: {
            id: WorldMetadataId,
            world_metadata: {
              aabb: {
                v0: aabb[0],
                v1: aabb[1],
              },
            },
          },
        },
      ],
    },
  ];

  console.log(`Updating the world metadata to: [[${aabb[0]}], [${aabb[1]}]]`);
  await promptToContinue();

  // Submit change.
  const request = createSignedApplyRequest(userId, transactions);
  const response = await client.apply(request);
  await client.close();
  console.log(response);
}

const [aabb] = process.argv.slice(2);
updateWorldBoundary(JSON.parse(aabb));

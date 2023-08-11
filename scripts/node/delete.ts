import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import { BiomesId, safeParseBiomesId } from "@/shared/ids";

async function deleteEntity(id?: BiomesId) {
  if (!id) {
    return;
  }
  await scriptInit(["untrusted-apply-token"]);

  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  const request = createSignedApplyRequest(userId, [
    {
      changes: [
        {
          kind: "delete",
          id,
        },
      ],
    },
  ]);
  await client.apply(request);
  console.log("Done.");
  await client.close();
}

deleteEntity(safeParseBiomesId(process.argv[2]));

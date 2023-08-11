import { scriptInit } from "@/server/shared/script_init";
import { BDB, createBdb, createStorageBackend } from "@/server/shared/storage";
import {
  createInviteCode,
  genInviteCodeString,
  getAllInviteCodes,
} from "@/server/web/db/invite_codes";
import { FirestoreInviteCode, FirestoreUser } from "@/server/web/db/types";
import { getAllUsers } from "@/server/web/db/users_fetch";
import { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";
import { range } from "lodash";

const DRY_RUN = false;
function numInvitesForUser(
  user: FirestoreUser,
  existingInvites: Array<FirestoreInviteCode>
) {
  if (
    existingInvites.length < 2 &&
    user.createMs &&
    user.createMs > 1668613330000
  ) {
    return 2;
  }

  return 0;
}

async function addInviteCode(db: BDB, user: FirestoreUser) {
  console.log("Creating code owned by", user.username, "(", user.id, ")");
  await createInviteCode(
    db,
    genInviteCodeString("EARLY"),
    1,
    user.id,
    `Automated Backfill Script @ ${Date.now()}`
  );
}

async function go() {
  await scriptInit();
  const storage = await createStorageBackend(DRY_RUN ? "shim" : "firestore");
  const db = createBdb(storage);

  const allUsers = await getAllUsers(db, 0, 10000000);
  const allInvites = await getAllInviteCodes(db);

  const inviteByUser = new MultiMap<BiomesId, FirestoreInviteCode>();
  for (const invite of allInvites) {
    if (invite.ownerId) {
      inviteByUser.add(invite.ownerId, invite);
    }
  }

  await Promise.all(
    allUsers.map(async (user) => {
      await Promise.all(
        range(numInvitesForUser(user, inviteByUser.get(user.id))).map(
          async () => await addInviteCode(db, user)
        )
      );
    })
  );
}

go();

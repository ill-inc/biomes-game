import { scriptInit } from "@/server/shared/script_init";
import { createBdb, createStorageBackend } from "@/server/shared/storage";

// This marks all users as enabled.
async function backfillDb() {
  await scriptInit();

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  const allUsers = (await db.collection("users").get()).docs;
  await Promise.all(
    allUsers.map((user) =>
      user.ref.update({
        disabled: false,
      })
    )
  );
}

backfillDb();

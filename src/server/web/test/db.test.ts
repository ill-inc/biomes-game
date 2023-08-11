import type { BDB } from "@/server/shared/storage";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import { findByUID } from "@/server/web/db/users_fetch";
import { createUser } from "@/server/web/test/test_helpers";
import assert from "assert";

describe("DB", () => {
  let db: BDB;
  beforeEach(async () => {
    db = createBdb(await createStorageBackend("memory"));
  });

  it("should support user writes", async () => {
    const userCreate = await createUser(db, "tommyd");
    const user = await findByUID(db, userCreate.id);
    assert.ok(user && user.username === "tommyd");
  });
});

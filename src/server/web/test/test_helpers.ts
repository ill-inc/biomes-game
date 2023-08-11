import type { BDB } from "@/server/shared/storage";
import type { TaskProcessor } from "@/server/shared/tasks/processor";
import type { GraphTaskList } from "@/server/shared/tasks/types";

import { getUserOrCreateIfNotExists } from "@/server/web/db/users";
import { findByUID } from "@/server/web/db/users_fetch";
import { generateTestId } from "@/shared/test_helpers";
import assert from "assert";

export async function createUser(db: BDB, username: string) {
  const uid = generateTestId();
  await getUserOrCreateIfNotExists(db, uid, username);
  const user = await findByUID(db, uid);
  assert.ok(user);
  return user;
}

export async function attemptTaskThroughSerialization<T extends GraphTaskList>(
  taskProcessor: TaskProcessor<T>,
  taskId: string
) {
  let isDone = false;
  let lastRet: Awaited<ReturnType<TaskProcessor<T>["attemptTask"]>>;
  while (!isDone) {
    const shouldContine = [true];
    lastRet = await taskProcessor.attemptTask(taskId, () => {
      const ret = shouldContine[0];
      shouldContine[0] = false;
      return ret;
    });
    isDone = lastRet.isDone;
  }

  return lastRet!;
}

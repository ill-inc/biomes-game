import type { ServerTasksSchema } from "@/server/shared/storage";
import type { CollectionReference } from "@/server/shared/storage/schema";
import type { FirestoreServerTask, WithId } from "@/server/web/db/types";

export async function scanAvailableTasks(
  taskTable: CollectionReference<ServerTasksSchema>
): Promise<string[]> {
  const eligible = await taskTable
    .where("processorExpiry", "<=", Date.now())
    // .where("taskNodeAvailableStartTime", "<=", Date.now()) -- unfortunately you cannot do multiple inequality filters here
    .where("finished", "==", false)
    .get();

  const availableToStart = eligible.docs.filter(
    (e) => e.data().taskNodeAvailableStartTime <= Date.now()
  );

  return availableToStart.map((e) => e.id);
}

export async function fetchTaskById(
  taskTable: CollectionReference<ServerTasksSchema>,
  id: string
): Promise<WithId<FirestoreServerTask, string> | undefined> {
  const doc = await taskTable.doc(id).get();
  return doc.dataWithId();
}

import type { ServerTasksSchema } from "@/server/shared/storage";
import type { CollectionReference } from "@/server/shared/storage/schema";
import { TaskProcessor } from "@/server/shared/tasks/processor";
import { serverTaskGraph } from "@/server/shared/tasks/server_tasks/graph";
import type { TaskProcessorDeps } from "@/server/shared/tasks/types";
import type { RegistryLoader } from "@/shared/registry";

export type ServerTaskProcessor = TaskProcessor<typeof serverTaskGraph>;

export async function registerServerTaskProcessor<C extends TaskProcessorDeps>(
  loader: RegistryLoader<C>
): Promise<ServerTaskProcessor> {
  const [db, firehose, idGenerator, logicApi] = await Promise.all([
    loader.get("db"),
    loader.get("firehose"),
    loader.get("idGenerator"),
    loader.get("logicApi"),
  ]);
  return new TaskProcessor(
    {
      db,
      firehose,
      idGenerator,
      logicApi,
    },
    serverTaskGraph,
    db.collection(
      process.env.NODE_ENV === "production"
        ? "server-tasks"
        : "server-tasks-dev"
    ) as CollectionReference<ServerTasksSchema>
  );
}

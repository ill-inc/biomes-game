import { fetchTaskById } from "@/server/web/db/tasks";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zTasksRequest = z.object({
  id: z.string(),
});

export const zTasksResponse = z.object({
  taskNodeName: z.string(),
  finished: z.boolean(),
});

export type TasksResponse = z.infer<typeof zTasksResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    query: zTasksRequest,
    response: zTasksResponse,
  },
  async ({ context: { serverTaskProcessor }, query: { id: taskId } }) => {
    const task = await fetchTaskById(serverTaskProcessor.taskTable, taskId);
    okOrAPIError(task, "not_found", `Task ${taskId} not found`);
    return {
      finished: task.finished,
      taskNodeName: task.taskNodeName,
    };
  }
);

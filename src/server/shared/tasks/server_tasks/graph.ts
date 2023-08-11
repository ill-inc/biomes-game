import { ALL_REPAIR_JOB_NODES } from "@/server/shared/tasks/server_tasks/ecs_repair";
import type { GraphTaskNode } from "@/server/shared/tasks/types";

export const serverTaskGraph = [...ALL_REPAIR_JOB_NODES] as const;
export type ServerTaskNode = GraphTaskNode<typeof serverTaskGraph>;

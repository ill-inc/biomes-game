import type { TaskServerContext } from "@/server/task/context";
import { registerTaskServer } from "@/server/task/server";
import type { RegistryBuilder } from "@/shared/registry";

export function installTaskModule<C extends TaskServerContext>(
  builder: RegistryBuilder<C>
) {
  builder.bind("taskServer", registerTaskServer);
}

import { loadBakedTrayFromProd } from "@/server/shared/bikkie/dev";
import { BikkieRuntime } from "@/shared/bikkie/active";

export async function loadBikkieForScript() {
  console.log("Loading Bikkie...");
  const baked = await loadBakedTrayFromProd();
  BikkieRuntime.get().registerBiscuits(baked.contents);
}

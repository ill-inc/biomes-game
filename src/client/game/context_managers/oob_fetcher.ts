import type { EarlyClientContext } from "@/client/game/context";
import type { OobFetcher } from "@/shared/api/oob";
import { RemoteOobFetcher } from "@/shared/api/oob";
import type { RegistryLoader } from "@/shared/registry";

export async function loadOobFetcher(
  loader: RegistryLoader<EarlyClientContext>
): Promise<OobFetcher> {
  return new RemoteOobFetcher(await loader.get("userId"));
}

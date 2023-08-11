import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientResources } from "@/client/game/resources/types";

export function useIsStaleSession() {
  const { io, reactResources, userId } = useClientContext();
  const playerSession = reactResources.use("/ecs/c/player_session", userId);
  return io.clientSessionId !== playerSession?.id;
}

export function showStaleSession(resources: ClientResources) {
  if (resources.get("/game_modal").kind !== "staleSession") {
    resources.set("/game_modal", { kind: "staleSession" });
  }
}

import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";

export const EntityLabel: React.FunctionComponent<{ entityId: BiomesId }> = ({
  entityId,
}) => {
  const { resources } = useClientContext();
  const [label] = useLatestAvailableComponents(entityId, "label");
  const targetName =
    label?.text ??
    relevantBiscuitForEntityId(resources, entityId)?.displayName ??
    "Entity";

  return <>{targetName}</>;
};

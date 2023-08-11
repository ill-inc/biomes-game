import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientRulesetHuds } from "@/server/shared/minigames/ruleset/client_types";
import type { PropsWithChildren } from "react";
import React from "react";

export const RulesetToggleable: React.FunctionComponent<
  PropsWithChildren<{
    name: ClientRulesetHuds;
  }>
> = React.memo(({ name, children }) => {
  const { reactResources } = useClientContext();
  const ruleset = reactResources.use("/ruleset/current");
  return ruleset.disabledHuds?.includes(name) ? <></> : <>{children}</>;
});

import { defaultDialogForNpc } from "@/client/components/challenges/helpers";
import { TalkToNpc } from "@/client/components/challenges/TalkDialogModal";
import type { TalkDialogStepAction } from "@/client/components/challenges/TalkDialogModalStep";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientContextSubset } from "@/client/game/context";
import type {
  GeneratedChatRequest,
  GeneratedChatResponse,
} from "@/pages/api/npcs/generated_chat";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { useCallback, useRef, useState } from "react";

export function useCanTalkToNpc(
  deps: ClientContextSubset<"resources" | "reactResources">,
  entityId: BiomesId
) {
  deps.reactResources.useAll(
    ["/ecs/c/entity_description", entityId],
    ["/ecs/c/quest_giver", entityId]
  );
  return canTalkToNpc(deps, entityId);
}

export function canTalkToNpc(
  deps: ClientContextSubset<"resources">,
  entityId: BiomesId
) {
  const item = relevantBiscuitForEntityId(deps.resources, entityId);
  const entityDescription = deps.resources.get(
    "/ecs/c/entity_description",
    entityId
  );
  const questGiver = deps.resources.get("/ecs/c/quest_giver", entityId);
  if ((Boolean(questGiver) || entityDescription?.text) && entityId) {
    return true;
  } else if (item?.isMount) {
    return true;
  }

  return false;
}

export const TalkToNpcDefaultDialog: React.FunctionComponent<{
  talkingToNPCId: BiomesId;
  onClose: () => unknown;
}> = ({ talkingToNPCId, onClose }) => {
  const clientContext = useClientContext();
  const { resources } = clientContext;
  const [id, setId] = useState(0);
  const [currentDialog, setCurrentDialog] = useState(
    defaultDialogForNpc(resources, talkingToNPCId)
  );
  const relevantBiscuit = relevantBiscuitForEntityId(
    clientContext.resources,
    talkingToNPCId
  );
  const [additionalActions, setAdditionalActions] = useState<
    TalkDialogStepAction[]
  >(() => {
    if (!resources.get("/ecs/c/entity_description", talkingToNPCId)?.text) {
      if (relevantBiscuit && relevantBiscuit.isMount) {
        return [
          {
            name: "Sing Song",
            onPerformed() {
              void respondWith(undefined);
            },
          },
        ];
      }
      return [];
    }

    return [
      {
        name: "Chit Chat",
        onPerformed() {
          void respondWith(undefined);
        },
      },
    ];
  });
  const [querying, setQuerying] = useState(false);

  const lastMessageContext = useRef<string | undefined>(undefined);

  const respondWith = useCallback(async (message: string | undefined) => {
    setQuerying(true);
    try {
      const res = await jsonPost<GeneratedChatResponse, GeneratedChatRequest>(
        "/api/npcs/generated_chat",
        {
          entityId: talkingToNPCId,
          messageContext: lastMessageContext.current,
          userResponse: message,
        }
      );
      setCurrentDialog(res.nextDialog.message);
      setId((old) => old + 1);
      lastMessageContext.current = res.messageContext;
      setAdditionalActions(
        res.nextDialog.buttons.map(
          (e): TalkDialogStepAction => ({
            name: e,
            onPerformed: () => {
              void respondWith(e);
            },
          })
        )
      );
    } catch (error: any) {
      log.error("Error querying for generated chat", { error });
      setCurrentDialog("That's all folks!");
      setAdditionalActions([]);
    } finally {
      setQuerying(false);
    }
  }, []);

  return (
    <TalkToNpc
      talkingToNpcId={talkingToNPCId}
      id={id}
      dialogText={
        querying ? "<text>[looks deep in thought...]</text>" : currentDialog
      }
      completeStep={onClose}
      advanceText="Close"
      buttonLayout="vertical"
      additionalActions={additionalActions.map((e) => ({
        ...e,
        disabled: querying,
      }))}
    />
  );
};

import { DecoratedNpcText } from "@/client/components/challenges/QuestViews";
import SimpleTextScreen from "@/client/components/challenges/SimpleTextScreen";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";

const SignScreen: React.FunctionComponent<{ placeableId: BiomesId }> = ({
  placeableId,
}) => {
  const context = useClientContext();
  const placeable = relevantBiscuitForEntityId(context.resources, placeableId);
  return (
    <SimpleTextScreen>
      <DecoratedNpcText
        text={placeable?.npcDefaultDialog ?? ""}
        highlightClass="font-semibold"
      />
    </SimpleTextScreen>
  );
};

export default SignScreen;

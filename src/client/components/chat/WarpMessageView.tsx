import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useCachedGroupBundle,
  useCachedPostBundle,
} from "@/client/util/social_manager_hooks";
import type { WarpMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { niceTruncate } from "@/shared/util/helpers";

export const WarpMessageView: React.FunctionComponent<{
  envelope: Envelope;
  message: WarpMessage;
}> = ({ message, envelope }) => {
  const { reactResources, socialManager } = useClientContext();
  if (!envelope.from) {
    // Don't support server-side warps yet
    return <></>;
  }

  let description: string = "a thing";
  let attribution: BiomesId | undefined;
  switch (message.documentType) {
    case "post":
      const post = useCachedPostBundle(socialManager, message.documentId);
      description = "a photo";
      if (post && post.author) {
        attribution = post.author.id;
      }
      break;
    case "environment_group":
      const group = useCachedGroupBundle(socialManager, message.documentId);
      if (group && group.name) {
        description = `"${niceTruncate(group.name, 20)}"`;
      } else {
        description = "a group";
      }
      break;
  }

  return (
    <div className="message emote center">
      <AvatarView userId={envelope.from} />
      <div>
        <span className="actor">
          <LinkableUsername who={envelope.from} />
        </span>{" "}
        warped to{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            reactResources.set("/game_modal", {
              kind: "generic_miniphone",
              rootPayload: {
                type: "social_detail",
                documentId: message.documentId,
                documentType: message.documentType,
              },
            });
          }}
        >
          {description}{" "}
        </a>
        {!!attribution && (
          <span>
            by <LinkableUsername who={attribution} />
          </span>
        )}
      </div>
    </div>
  );
};

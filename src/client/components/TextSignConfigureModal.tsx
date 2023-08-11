import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { DialogButton } from "@/client/components/system/DialogButton";
import { ChangeTextSignContentsEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { useEffect, useRef } from "react";

export const TextSignConfigureModal: React.FunctionComponent<{
  onClose?: () => void;
  placeableId: BiomesId;
}> = ({ onClose, placeableId }) => {
  const { reactResources, events, resources, userId } = useClientContext();
  const item = relevantBiscuitForEntityId(resources, placeableId);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [signComponent, placeableElement] = reactResources.useAll(
    ["/ecs/c/text_sign", placeableId],
    ["/ecs/c/placeable_component", placeableId]
  );

  if (!placeableElement) {
    onClose?.();
    return <></>;
  }

  useEffect(() => {
    if (inputRef.current) {
      if (signComponent) {
        inputRef.current.value = signComponent?.text.join("\n");
      }
      inputRef.current.focus();
    }
  }, []);

  return (
    <DialogBox>
      <DialogBoxTitle>Edit Sign</DialogBoxTitle>
      <DialogBoxContents>
        {!item || !item.textSignConfiguration ? (
          <>
            Sign not properly configured
            <DialogButton
              onClick={() => {
                onClose?.();
              }}
            >
              Close
            </DialogButton>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.6">
              <textarea
                ref={inputRef}
                className="h-7 items-center text-center font-vt"
                onKeyDown={(e) => {
                  // Prevent accidentally removing the last line when a return is entered
                  const el = e.target as HTMLTextAreaElement;
                  const lines = el.value.split(/(\r\n|\n|\r)/gm);
                  if (
                    e.code === "Enter" &&
                    lines.length > item.textSignConfiguration!.line_count
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const lines = e.target.value.split(/(\r\n|\n|\r)/gm);
                  lines.map((line, i) => {
                    if (
                      line.length >= item.textSignConfiguration!.max_line_length
                    ) {
                      lines[i] = line.substring(
                        0,
                        item?.textSignConfiguration?.max_line_length
                      );
                    }
                  });
                  e.target.value = lines
                    .splice(0, item.textSignConfiguration!.line_count * 2 - 1)
                    .join("");
                }}
              />
            </div>
            <DialogButton
              type="primary"
              onClick={async () => {
                if (!inputRef.current) {
                  return;
                }

                const text = inputRef.current.value
                  .split(/\r?\n/)
                  .splice(0, item.textSignConfiguration!.line_count);

                await events.publish(
                  new ChangeTextSignContentsEvent({
                    id: placeableId,
                    text: text,
                    user_id: userId,
                  })
                );

                onClose?.();
              }}
            >
              Save
            </DialogButton>
            <DialogButton
              onClick={() => {
                onClose?.();
              }}
            >
              Cancel
            </DialogButton>
          </>
        )}
      </DialogBoxContents>
    </DialogBox>
  );
};

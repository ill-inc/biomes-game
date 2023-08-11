import { EditCharacterColorSelector } from "@/client/components/character/EditCharacterColorSelector";
import { EditCharacterHeadShapePanel } from "@/client/components/character/EditCharacterHeadShapePanel";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { MaybeError } from "@/client/components/system/MaybeError";

import type {
  Appearance,
  Item,
  ReadonlyAppearance,
} from "@/shared/ecs/gen/types";
import { ok } from "assert";
import { useEffect, useRef } from "react";

export const EditCharacterContent: React.FunctionComponent<{
  previewAppearance?: ReadonlyAppearance;
  setPreviewAppearance: (x: (old: Appearance) => Appearance) => void;
  previewHair?: Item;
  setPreviewHair: (x: Item | undefined) => void;
  username: string | undefined;
  onUsernameChange: (username: string) => void;
  usernameError?: undefined | any;
  usernameDisabled?: boolean;
  signingUp: boolean;
}> = ({
  previewAppearance,
  setPreviewAppearance,
  previewHair,
  setPreviewHair,
  username,
  onUsernameChange,
  usernameError,
  usernameDisabled,
  signingUp,
}) => {
  const context = useClientContext();

  if (!previewAppearance) {
    previewAppearance = context.reactResources.use(
      "/ecs/c/appearance_component",
      context.userId
    )?.appearance;
  }
  ok(previewAppearance);

  const usernameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    usernameField.current?.focus();
  }, []);

  return (
    <div className="form">
      <section>
        <label>Username</label>
        {signingUp && (
          <label className="sublabel">
            You can change your username at any time
          </label>
        )}
        <input
          type="text"
          ref={usernameField}
          value={username}
          spellCheck={false}
          size={20}
          disabled={!!usernameDisabled}
          maxLength={20}
          onChange={(e) => onUsernameChange(e.target.value)}
        />

        <MaybeError error={usernameError} />
      </section>
      <section>
        <EditCharacterHeadShapePanel
          selectedId={previewAppearance.head_id}
          previewAppearance={previewAppearance}
          onSelect={(newId) =>
            setPreviewAppearance((x) => ({
              ...x,
              ...{ head_id: newId },
            }))
          }
        />
      </section>
      <EditCharacterColorSelector
        previewAppearance={previewAppearance}
        setPreviewAppearance={setPreviewAppearance}
        previewHair={previewHair}
        setPreviewHair={setPreviewHair}
        showHeadShape={false}
      />
    </div>
  );
};

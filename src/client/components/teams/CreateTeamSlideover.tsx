import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { PaneSlideoverTitleBar } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import { CreateTeamEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget, sleep } from "@/shared/util/async";
import React, { useState } from "react";

export const CreateTeamSlideover: React.FunctionComponent<{
  onClose?: () => unknown;
  onCreate?: (teamId: BiomesId) => unknown;
}> = ({ onClose, onCreate }) => {
  const { events, userId, table } = useClientContext();
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useError();
  const [saving, setSaving] = useState(false);

  const cannotCreateReason = (() => {
    if (!teamName) {
      return "Team name is required";
    }

    if (saving) {
      return "Saving";
    }

    return undefined;
  })();

  const createTeam = async () => {
    setSaving(true);
    try {
      await events.publish(new CreateTeamEvent({ id: userId, name: teamName }));

      let foundTeam = false;
      for (let i = 0; i < 10; i++) {
        const teamId = table.get(userId)?.player_current_team?.team_id;
        if (teamId) {
          foundTeam = true;
          onCreate?.(teamId);
          break;
        }
        await sleep(1000);
      }

      if (!foundTeam) {
        throw new Error("May have failed to create");
      }
    } catch (error: any) {
      setError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaneLayout>
      <PaneSlideoverTitleBar onClose={onClose}>
        <BarTitle>Create Team</BarTitle>
      </PaneSlideoverTitleBar>
      <MaybeError error={error} />
      <div className="padded-view form">
        <section>
          <label>Team Name</label>
          <input
            type="text"
            placeholder="Team Name"
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
            }}
          />
        </section>
        <section>
          <div>With Teams you get:</div>
          <div>Linked Robots</div>
          <div>Team Flair</div>
          <div>Team Chat and more</div>
        </section>
      </div>
      <PaneBottomDock>
        <Tooltipped tooltip={cannotCreateReason}>
          <DialogButton
            onClick={() => {
              fireAndForget(createTeam());
            }}
            type="primary"
            disabled={!!cannotCreateReason}
          >
            Create Team
          </DialogButton>
        </Tooltipped>
      </PaneBottomDock>
    </PaneLayout>
  );
};

import { ColorRowHex } from "@/client/components/character/ColorRow";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableEntity } from "@/client/components/hooks/client_hooks";
import { DialogButton } from "@/client/components/system/DialogButton";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { UpdateTeamMetadataEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";
import { Emoji, emojiIndex, Picker } from "emoji-mart";
import emojiData from "emoji-mart/data/all.json";
import { useState } from "react";

export const EditTeamSheet: React.FunctionComponent<{
  teamId: BiomesId;
  onClose?: () => any;
  showing: boolean;
}> = ({ teamId, onClose, showing }) => {
  const teamEntity = useLatestAvailableEntity(teamId);
  const team = teamEntity?.team;
  const { events, userId } = useClientContext();
  const [teamName, setTeamName] = useState(teamEntity?.label?.text ?? "");
  const [teamColor, setTeamColor] = useState(team?.color);
  const [teamIcon, setTeamIcon] = useState(team?.icon);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const TEAM_COLORS = [
    0xc2e9ff, 0xffbbbe, 0xe7a4f0, 0xfafbc0, 0xe5daa6, 0xe3fbce, 0xc5ebdf,
    0xc7bbf6,
  ];

  const currentColorIndex = TEAM_COLORS.findIndex((e) => e === teamColor);

  return (
    <>
      <PaneActionSheet
        title="Edit Team"
        onClose={() => {
          onClose?.();
        }}
        showing={showing}
      >
        <div className="form padded-view">
          <section>
            <label>Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </section>

          <section>
            <label>Team Color</label>

            <div className="color-button-row grid-cols-8">
              <ColorRowHex
                colors={TEAM_COLORS}
                selectedIndex={currentColorIndex}
                onSelect={(index) => {
                  setTeamColor(TEAM_COLORS[index]);
                  ok(TEAM_COLORS[index]);
                }}
              />
            </div>
          </section>

          <section>
            <label>Team Flair</label>
            {emojiData.categories.map((category) => (
              <>
                <div className="grid grid-cols-6">
                  {category.emojis.map((emoji, i) => (
                    <div
                      key={i}
                      className={`flex aspect-square cursor-pointer items-center justify-center rounded-md ${
                        selectedEmoji === emoji
                          ? "bg-white/50 hover:bg-white/50"
                          : " hover:bg-white/10"
                      }`}
                      onClick={() => {
                        const e = emojiIndex.search(emoji);
                        if (e && e.length > 0) {
                          setSelectedEmoji(emoji);
                          setTeamIcon((e[0] as any).native);
                        }
                      }}
                    >
                      <Emoji native={true} size={24} emoji={emoji} />
                    </div>
                  ))}
                </div>
              </>
            ))}
            <Picker onSelect={(emoji) => setTeamIcon((emoji as any).native)} />
            <DialogButton
              onClick={() => {
                setShowEmojiPicker(true);
              }}
            >
              {teamIcon} Change Icon
            </DialogButton>{" "}
          </section>
        </div>

        <PaneBottomDock>
          <DialogButton
            type="primary"
            onClick={() => {
              onClose?.();
              fireAndForget(
                events.publish(
                  new UpdateTeamMetadataEvent({
                    id: userId,
                    team_id: teamId,
                    color: teamColor,
                    name: teamName,
                    icon: teamIcon,
                  })
                )
              );
            }}
          >
            Save
          </DialogButton>
        </PaneBottomDock>
      </PaneActionSheet>

      <PaneActionSheet
        showing={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
        }}
      >
        <Picker
          showPreview={false}
          onSelect={(e) => {
            setTeamIcon((e as any).native);
            setShowEmojiPicker(false);
          }}
        />
      </PaneActionSheet>
    </>
  );
};

import { DialogButton } from "@/client/components/system/DialogButton";
import { PaneActionSheet } from "@/client/components/system/mini_phone/split_pane/PaneActionSheet";
import { DISCORD_URL } from "@/shared/constants";
import discordIcon from "/public/hud/icon-discord-vector.png";

export const InviteSheet: React.FunctionComponent<{
  showing: boolean;
  setShowing: (showing: boolean) => any;
}> = ({ showing, setShowing }) => {
  return (
    <PaneActionSheet
      title="Invite"
      size="auto-height"
      onClose={() => {
        setShowing(false);
      }}
      showing={showing}
    >
      <div className="flex select-text flex-col items-center  gap-1 p-2 text-center">
        Share the Discord link to give friends immediate access to play:
        <br />
        <a href={DISCORD_URL} className="select-text">
          {DISCORD_URL}
        </a>
        <DialogButton
          extraClassNames="flex-row bg-discord gap-0.6"
          onClick={() => {
            void navigator.clipboard.writeText(DISCORD_URL);
          }}
        >
          <img
            src={discordIcon.src}
            className="h-2.5 w-2.5 filter-image-drop-shadow"
          />{" "}
          Copy Link
        </DialogButton>
      </div>
    </PaneActionSheet>
  );
};

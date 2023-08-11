import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { ErrorMessage } from "@/shared/chat/messages";
import serverIcon from "/public/hud/biomes-logo-24.png";

export const ErrorMessageView: React.FunctionComponent<{
  message: ErrorMessage;
}> = ({ message }) => {
  return (
    <div className="message error center">
      <ShadowedImage extraClassNames="avatar" src={serverIcon.src} />
      {message.content}
    </div>
  );
};

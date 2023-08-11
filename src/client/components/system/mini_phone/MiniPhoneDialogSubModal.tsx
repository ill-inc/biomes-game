import {
  DialogBox,
  DialogBoxContents,
  DialogBoxTitle,
} from "@/client/components/system/DialogBox";
import { MiniPhoneSubModal } from "@/client/components/system/mini_phone/MiniPhoneSubModal";
import type { PropsWithChildren } from "react";

export const MiniPhoneDialogSubModal: React.FunctionComponent<
  PropsWithChildren<{
    title: string;
    onDismissal: () => unknown;
  }>
> = ({ children, title, onDismissal }) => {
  return (
    <MiniPhoneSubModal onDismissal={onDismissal}>
      <DialogBox>
        <DialogBoxTitle>{title}</DialogBoxTitle>
        <DialogBoxContents>{children}</DialogBoxContents>
      </DialogBox>
    </MiniPhoneSubModal>
  );
};

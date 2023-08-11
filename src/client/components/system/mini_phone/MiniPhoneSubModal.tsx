import type { HUDModalProps } from "@/client/components/system/HUDModal";
import { HUDModal } from "@/client/components/system/HUDModal";
import type { PropsWithChildren } from "react";
import React from "react";

export const MiniPhoneSubModal: React.FunctionComponent<
  PropsWithChildren<HUDModalProps>
> = (props) => {
  return <HUDModal {...props}>{props.children}</HUDModal>;
};

import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError } from "@/client/components/system/MaybeError";
import {
  MiniPhoneCloseItem,
  MiniPhoneMoreItem,
} from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { Img } from "@react-email/img";
import type { PropsWithChildren } from "react";
import React, { useState } from "react";

export interface LoginMethod {
  name: string;
  icon: string;
  showByDefault?: boolean;
  disclaimer?: string;
  onLogin: () => Promise<unknown>;
  onCreate: () => Promise<unknown>;
}

export const LoginMethodPicker: React.FunctionComponent<
  PropsWithChildren<{
    error?: any;
    title?: string;
    subtitle?: string;
    disclaimer?: string | JSX.Element;
    methods: LoginMethod[];
    create?: boolean;
    onSpecialClick?: () => any;
  }>
> = ({
  error,
  title,
  subtitle,
  disclaimer,
  methods,
  create,
  onSpecialClick,
  children,
}) => {
  const [showAll, setShowAll] = useState(false);
  return (
    <div>
      <div className="biomes-box dialog login-flow">
        {title && (
          <div className="title-bar">
            <div className="invisible">
              <MiniPhoneCloseItem />
            </div>
            <div
              style={{ userSelect: "none" }}
              className="title"
              onClick={(e) => {
                if (e.detail === 3 && e.shiftKey) {
                  onSpecialClick?.();
                }
              }}
            >
              {" "}
              {title}{" "}
            </div>
            <div className="">
              <MiniPhoneMoreItem onClick={() => setShowAll(!showAll)} />
            </div>
          </div>
        )}
        <div className="dialog-contents">
          <MaybeError error={error} />
          {subtitle && (
            <div className="w-full text-center text-shadow-drop">
              {subtitle}
            </div>
          )}
          <div className="flex flex-col gap-0.8">
            {methods.map(
              ({
                name,
                showByDefault,
                icon,
                onLogin,
                onCreate,
                disclaimer,
              }) => {
                if (!showAll && !showByDefault) {
                  return undefined;
                }
                return (
                  <DialogButton
                    size="marge"
                    extraClassNames={`flex flex-row px-1 ${
                      name === "Discord"
                        ? "bg-discord"
                        : name === "Twitch"
                        ? "bg-twitch"
                        : undefined
                    }`}
                    onClick={() => {
                      if (create) {
                        void onCreate();
                      } else {
                        void onLogin();
                      }
                    }}
                    key={name}
                  >
                    {icon && (
                      <Img
                        src={icon}
                        className="w-2.5 filter-image-drop-shadow"
                      />
                    )}
                    <div className="flex flex-1 flex-col">
                      <div>Login with {name}</div>
                      {disclaimer && (
                        <div className="text-xs">{disclaimer}</div>
                      )}
                    </div>
                    {icon && (
                      <Img
                        src={icon}
                        className="invisible w-3"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                  </DialogButton>
                );
              }
            )}
          </div>
          <div className="dialog-button-group">{children}</div>
        </div>
      </div>
      <div className="mt-1 w-left-pane text-center text-xs text-shadow-drop">
        {disclaimer}
      </div>
    </div>
  );
};

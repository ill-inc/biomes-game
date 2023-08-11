import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { isTouchDevice } from "@/client/components/contexts/PointerLockContext";
import { useAnimation } from "@/client/util/animation";
import type { Vec2 } from "@/shared/math/types";
import dynamic from "next/dynamic";
import React, { useRef } from "react";
import { JoystickShape } from "react-joystick-component";

const Joystick = dynamic(
  () => import("react-joystick-component").then((mod) => mod.Joystick),
  {
    ssr: false,
  }
);

export const MaybeJoystickInput: React.FunctionComponent<{}> = React.memo(
  ({}) => {
    const { clientConfig } = useClientContext();

    if (!clientConfig.showVirtualJoystick) {
      return <></>;
    }

    return <JoystickInput />;
  }
);

export const JoystickInput: React.FunctionComponent<{}> = ({}) => {
  const { input, userId } = useClientContext();
  const joystickSize = Math.min(window.outerWidth / 6, window.outerHeight / 6);

  const leftPosRef = useRef([0, 0] as Vec2);
  const rightPosRef = useRef([0, 0] as Vec2);

  useAnimation(() => {
    input.moveVirtualJoycon("left", ...leftPosRef.current);
    if (!isTouchDevice()) {
      input.moveVirtualJoycon("right", ...rightPosRef.current);
    }
  });

  return (
    <div className="joysticks">
      {userId && (
        <div className="joystick left">
          <Joystick
            size={joystickSize}
            baseColor="rgb(0, 0, 51)"
            stickColor="rgba(61, 89, 171)"
            stickShape={JoystickShape.Square}
            baseShape={JoystickShape.Square}
            stop={() => {
              leftPosRef.current = [0, 0];
            }}
            move={(evt) => {
              leftPosRef.current = [evt.x ?? 0, evt.y ?? 0];
            }}
          />
        </div>
      )}
      <div className="spacer" />
      {!isTouchDevice() && (
        <div className="joystick right">
          <Joystick
            size={joystickSize}
            baseColor="rgb(0, 0, 51)"
            stickColor="rgba(61, 89, 171)"
            stickShape={JoystickShape.Square}
            baseShape={JoystickShape.Square}
            stop={() => {
              rightPosRef.current = [0, 0];
            }}
            move={(evt) => {
              rightPosRef.current = [evt.x ?? 0, evt.y ?? 0];
            }}
          />
        </div>
      )}
    </div>
  );
};

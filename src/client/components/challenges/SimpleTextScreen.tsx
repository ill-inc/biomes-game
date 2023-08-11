import {
  MiniPhoneScreen,
  MiniPhoneScreenContent,
  MiniPhoneScreenTitle,
} from "@/client/components/system/mini_phone/MiniPhoneScreen";
import type { PropsWithChildren } from "react";

const SimpleTextScreen: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return (
    <MiniPhoneScreen>
      <MiniPhoneScreenTitle></MiniPhoneScreenTitle>
      <MiniPhoneScreenContent>
        <div className="mx-auto flex h-full w-full flex-col justify-stretch gap-2">
          <div className="flex flex-[1_1_auto] flex-col gap-1 overflow-y-auto p-8 pb-4 pt-6 text-xl font-medium">
            {children}
          </div>
        </div>
      </MiniPhoneScreenContent>
    </MiniPhoneScreen>
  );
};

export default SimpleTextScreen;

import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";

export const BarMoreMenu: React.FunctionComponent<{
  showing: boolean;
  setShowing: (showing: boolean) => any;
  items: MoreMenuItem[];
}> = ({ items, showing, setShowing }) => {
  return (
    <MoreMenu
      items={items}
      extraClassNames={"mini-phone-more"}
      anchor={"left"}
      showing={showing}
      setShowing={setShowing}
    />
  );
};

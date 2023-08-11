import type { UserFilter } from "@/client/game/helpers/social";
import { useUserPredicate } from "@/client/game/helpers/social";
import type { UserBundle } from "@/shared/types";
import type { PropsWithChildren } from "react";

export const FilteredUser: React.FC<
  PropsWithChildren<{
    user: UserBundle;
    filters: UserFilter[];
  }>
> = ({ user, filters, children }) => {
  const display = useUserPredicate(user, filters);
  return display ? <>{children}</> : <></>;
};

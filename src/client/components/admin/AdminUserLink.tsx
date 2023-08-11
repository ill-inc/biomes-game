import type { BiomesId } from "@/shared/ids";
import Link from "next/link";
import type { PropsWithChildren } from "react";
import React from "react";

export const AdminUserLink: React.FunctionComponent<
  PropsWithChildren<{
    userId: BiomesId;
  }>
> = ({ userId, children }) => {
  return <Link href={`/admin/user/${userId}`}>{children}</Link>;
};

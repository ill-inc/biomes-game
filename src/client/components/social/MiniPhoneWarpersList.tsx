import { UserListView } from "@/client/components/social/MiniPhoneUserList";
import { useError } from "@/client/components/system/MaybeError";
import type { WarpersListResponse } from "@/pages/api/social/warpers_list";
import type { BiomesId } from "@/shared/ids";
import type { SocialDocumentType, UserBundle } from "@/shared/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { dictToQueryString } from "@/shared/util/helpers";
import React, { useCallback, useEffect, useState } from "react";

export const WarpersListView: React.FunctionComponent<{
  documentId: BiomesId;
  documentType: SocialDocumentType;
}> = ({ documentId, documentType }) => {
  const [error, setError] = useError();
  const [warpersListResponse, setWarpersListResponse] = useState<
    WarpersListResponse | undefined
  >();
  const [warpers, setWarpers] = useState<UserBundle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPage = useCallback(
    async (pagingToken?: string) => {
      setLoading(true);
      try {
        const queryString = dictToQueryString({
          documentType,
          documentId,
          pagingToken,
        });
        const res = await jsonFetch<WarpersListResponse>(
          `/api/social/warpers_list?${queryString}`
        );
        setWarpersListResponse(res);
        setWarpers([...warpers, ...res.users]);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [warpers]
  );

  useEffect(() => {
    void loadPage();
  }, []);

  return (
    <UserListView
      title="Warpers"
      loading={loading}
      error={error}
      users={warpers}
      onLoadMore={() => {
        void loadPage(warpersListResponse?.pagingToken);
      }}
      canLoadMore={!!warpersListResponse?.pagingToken}
    />
  );
};

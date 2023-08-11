import { UserListView } from "@/client/components/social/MiniPhoneUserList";
import { useError } from "@/client/components/system/MaybeError";
import { useEffectAsync } from "@/client/util/hooks";
import type { LikersListResponse } from "@/pages/api/social/likers_list";
import type { BiomesId } from "@/shared/ids";
import type { SocialDocumentType, UserBundle } from "@/shared/types";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { dictToQueryString } from "@/shared/util/helpers";
import React, { useCallback, useState } from "react";

export const MiniPhoneLikersList: React.FunctionComponent<{
  documentId: BiomesId;
  documentType: SocialDocumentType;
}> = ({ documentId, documentType }) => {
  const [error, setError] = useError();
  const [likersListResponse, setLikersListResponse] = useState<
    LikersListResponse | undefined
  >();
  const [loading, setLoading] = useState(false);
  const [likers, setLikers] = useState<UserBundle[]>([]);

  const loadPage = useCallback(
    async (pagingToken?: string) => {
      setLoading(true);
      try {
        const queryString = dictToQueryString({
          documentType,
          documentId,
          pagingToken,
        });
        const res = await jsonFetch<LikersListResponse>(
          `/api/social/likers_list?${queryString}`
        );
        setLikersListResponse(res);
        setLikers([...likers, ...res.users]);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [likers]
  );

  useEffectAsync(async () => {
    void loadPage();
  }, []);

  return (
    <UserListView
      title="Likers"
      loading={loading}
      error={error}
      users={likers}
      canLoadMore={!!likersListResponse?.pagingToken}
      onLoadMore={() => {
        void loadPage(likersListResponse?.pagingToken);
      }}
    />
  );
};

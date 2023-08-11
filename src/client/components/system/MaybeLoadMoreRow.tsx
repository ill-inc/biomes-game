import React from "react";

export const MaybeLoadMoreRow: React.FunctionComponent<{
  loading: boolean;
  canLoadMore: boolean;
  onLoadMore: () => any;
}> = ({ canLoadMore, loading, onLoadMore }) => {
  if (!canLoadMore || loading) {
    return <></>;
  }

  return (
    <div className="load-more-row can-load" onClick={onLoadMore}>
      Load More
    </div>
  );
};

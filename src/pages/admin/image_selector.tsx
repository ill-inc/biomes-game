import { AdminPage } from "@/client/components/admin/AdminPage";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { useCuratedPhotos } from "@/client/util/social_manager_hooks";
import type { BiomesId } from "@/shared/ids";
import type { CuratedFeedPostBundle } from "@/shared/types";
import { useMemo, useState } from "react";

const CuratedImageWrapper: React.FC<
  React.PropsWithChildren<{
    approved: boolean;
    onClick: (e: any) => void;
  }>
> = ({ approved, onClick, children }) => {
  if (approved) {
    return (
      <div
        className="rounded border-[5px] border-solid border-green"
        onClick={onClick}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="rounded border-[5px] border-solid border-red"
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const ImageSelector: React.FunctionComponent<{}> = () => {
  const { bundles, isLoading, toggleApproval, maybeLoadMore, canLoadMore } =
    useCuratedPhotos({
      pageSize: 200,
    });
  const allApproved = useCuratedPhotos({
    pageSize: 500,
    status: "approved",
  });
  const [includeApproved, setIncludeApproved] = useState<boolean>(true);
  const [includeNotApproved, setIncludeNotApproved] = useState<boolean>(true);
  const [newestToOldest, setNewestToOldest] = useState<boolean>(true);

  const onSelectImage = async (photoId: BiomesId) => {
    await toggleApproval(photoId);
  };

  const allBundles: CuratedFeedPostBundle[] = useMemo(() => {
    return [...allApproved.bundles, ...bundles].filter((elem, index, self) => {
      return index === self.findIndex((value) => elem.id === value.id);
    });
  }, [allApproved.bundles, bundles]);
  const orderAdjustedBundles: CuratedFeedPostBundle[] = useMemo(() => {
    const sorted = [...allBundles].sort((a, b) => {
      if (newestToOldest) {
        return b.priority - a.priority;
      } else {
        return a.priority - b.priority;
      }
    });
    return sorted;
  }, [newestToOldest, allBundles]);
  const approvedCount = useMemo(() => {
    return allBundles.filter(({ approved }) => approved).length;
  }, [allBundles]);

  const handleClick = (
    _e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    postId: BiomesId
  ) => {
    void onSelectImage(postId);
  };

  return (
    <AdminPage>
      <div className="relative">
        <div className="sticky top-0 z-20 mb-1 mt-1 flex w-[300px] flex-col gap-1 bg-dark-grey p-1">
          <div className="text-med">
            {isLoading
              ? "Loading..."
              : `Image Selector [approved ${approvedCount} / ${bundles.length}]`}
          </div>
          <DialogCheckbox
            label="Show approved"
            checked={includeApproved}
            onCheck={setIncludeApproved}
          />
          <DialogCheckbox
            label="Show not approved"
            checked={includeNotApproved}
            onCheck={setIncludeNotApproved}
          />
          <DialogCheckbox
            label="Newest to oldest"
            checked={newestToOldest}
            onCheck={setNewestToOldest}
          />
        </div>

        <div className="justify-left flex flex-row flex-wrap gap-[3px]">
          {orderAdjustedBundles.map(({ post, approved }) => {
            if (approved && !includeApproved) {
              return null;
            } else if (!approved && !includeNotApproved) {
              return null;
            }
            return (
              <CuratedImageWrapper
                onClick={(e) => handleClick(e, post.id)}
                approved={approved}
                key={post.id}
              >
                <div
                  style={{
                    border: "1vmin solid white",
                  }}
                  className={`slideshow-image relative flex cursor-pointer flex-col bg-white font-vt text-dark-grey text-shadow-[none]`}
                >
                  <div className="group pointer-events-none relative select-none bg-dark-grey">
                    <img
                      className="pointer-events-none relative w-[400px] select-none"
                      src={post.imageUrls.webp_1280w}
                    />
                  </div>
                  <div className="w-[400px] select-none bg-white p-1 pb-0 text-[18px]">
                    {post.caption && `${post.caption} —— `}{" "}
                    {post.author.username}
                  </div>
                </div>
              </CuratedImageWrapper>
            );
          })}
        </div>
        <div className="mt-1 w-full">
          {canLoadMore && (
            <DialogButton
              disabled={isLoading}
              name={isLoading ? "Loading..." : "Load more"}
              onClick={maybeLoadMore}
            />
          )}
        </div>
      </div>
    </AdminPage>
  );
};

export default ImageSelector;

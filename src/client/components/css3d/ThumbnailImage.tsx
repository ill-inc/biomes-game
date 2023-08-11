import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useEffect } from "react";

export const ThumbnailImage: React.FunctionComponent<{
  show: boolean;
  width: number;
  height: number;
  url: string | undefined;
}> = ({ show, width, height, url }) => {
  const { reactResources } = useClientContext();

  useEffect(() => {
    if (show) {
      reactResources.update(
        "/is_taking_screenshot",
        (current) => (current.thumbnailsLoading += 1)
      );
    }
  }, [show]);

  if (!show) {
    return <></>;
  }

  return (
    <img
      className="z-10"
      src={url}
      style={{
        width,
        height,
      }}
      onLoad={() => {
        reactResources.update(
          "/is_taking_screenshot",
          (current) =>
            (current.thumbnailsLoading = Math.max(
              current.thumbnailsLoading - 1,
              0
            ))
        );
      }}
    />
  );
};

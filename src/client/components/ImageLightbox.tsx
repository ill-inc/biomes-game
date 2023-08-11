import { Img } from "@/client/components/system/Img";

export const ImageLightbox: React.FunctionComponent<{
  image: string | undefined;
  setShowLightbox: (state: boolean) => void;
}> = ({ image, setShowLightbox }) => {
  return (
    <div
      className="lightbox"
      onClick={() => {
        setShowLightbox(false);
      }}
    >
      <Img src={image} className="lightbox-img" />
    </div>
  );
};

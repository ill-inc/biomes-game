import { Img } from "@/client/components/system/Img";
import spinnerGif from "/public/hud/spinner.gif";
export const MaybeGridSpinner: React.FunctionComponent<{
  isLoading: boolean;
}> = ({ isLoading }) => {
  return (
    <>
      {isLoading && (
        <div className="grid-spinner">
          <Img src={spinnerGif.src} />
        </div>
      )}
    </>
  );
};

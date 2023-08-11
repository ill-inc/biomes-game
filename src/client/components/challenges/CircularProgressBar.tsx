import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import checkmark from "/public/hud/icon-check-12.png";

export const CircularProgressBar: React.FunctionComponent<{
  progress: number;
  backgroundColor: string;
}> = ({ progress, backgroundColor }) => {
  const percent = progress * 100;
  return (
    <div className={`progress ${percent < 100 ? "" : "complete"}`}>
      {percent < 100 ? (
        <CircularProgressbar
          value={percent}
          background
          backgroundPadding={0}
          strokeWidth={20}
          styles={buildStyles({
            backgroundColor: backgroundColor,
            pathColor: "#fff",
            trailColor: "rgba(255,255,255,0.6)",
          })}
        />
      ) : (
        <img className="checkmark" src={checkmark.src} />
      )}
    </div>
  );
};

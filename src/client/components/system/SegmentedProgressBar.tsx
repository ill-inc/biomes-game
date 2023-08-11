import React from "react";

export const SegmentedProgressBar: React.FunctionComponent<{
  percentage: number;
}> = ({ percentage }) => {
  const width = (100 - 6) * percentage + 6;
  return (
    <div className="segmented-progress-bar">
      <div
        className="segmented-progress-bar-fill"
        style={{ width: `calc(${width}% - .8vmin)` }}
      ></div>
    </div>
  );
};

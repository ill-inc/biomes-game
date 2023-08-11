import { concat, uniqueId } from "lodash";
import React, { useRef } from "react";

export const FillerSlot: React.FunctionComponent<{
  extraClasses?: string[];
}> = ({ extraClasses }) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const dragElementId = uniqueId();
  const classNames = concat(["cell", "blank", "empty"], extraClasses);

  return (
    <div
      id={dragElementId}
      ref={dragRef}
      className={classNames.join(" ")}
    ></div>
  );
};

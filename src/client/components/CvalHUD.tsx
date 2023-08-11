import { useInterval } from "@/client/util/intervals";
import {
  AccumulatorContext,
  collectAllAsHumanReadable,
  defaultCvalDatabase,
} from "@/shared/util/cvals";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

// The `react-json-view` component references `window` during module load, so
// we can't do any server side rendering with it.
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

export function CvalHUD() {
  const accumulatorContext = useMemo(() => new AccumulatorContext(), []);
  const updateCvalJson = () =>
    collectAllAsHumanReadable(
      defaultCvalDatabase(),
      accumulatorContext,
      performance.now() / 1000
    );
  const [cvalsJson, setCvalsJson] = useState(updateCvalJson());

  // Re-render with traffic statistics every second.
  useInterval(() => {
    setCvalsJson(updateCvalJson());
  }, 500);

  return (
    <div>
      <div className="cval-hud">
        <ReactJson
          src={cvalsJson}
          name="cvals"
          theme={{
            // This is a tweaked version of the "eighties" scheme from:
            //   https://github.com/gaearon/base16-js/blob/master/src/eighties.js
            base00: "#2d2d2d",
            base01: "#393939",
            base02: "#515151",
            base03: "#747369",
            base04: "#a09f93",
            base05: "#d3d0c8",
            base06: "#e8e6df",
            base07: "#ffffff", // internal node text color
            base08: "#f2777a",
            base09: "#f9b177", // string text color
            base0A: "#ffcc66",
            base0B: "#d0ffd0", // float colors
            base0C: "#66cccc",
            base0D: "#6699cc",
            base0E: "#cc99cc",
            base0F: "#d0ffd0", // int colors
          }}
          iconStyle="square"
          collapsed={true}
          style={{
            background: "transparent",
          }}
          enableClipboard={false}
          indentWidth={1}
          displayDataTypes={false}
          displayObjectSize={false}
          quotesOnKeys={false}
        />
      </div>
    </div>
  );
}

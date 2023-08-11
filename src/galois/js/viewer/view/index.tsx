import { AssetView } from "@/galois/components/AssetView";
import {
  reloadCountAndButton,
  ReloadCountContext,
} from "@/galois/components/helpers/ReloadButton";
import type { Asset } from "@/galois/lang";
import { clientApi } from "@/galois/viewer/view/api";
import { Nav } from "@/galois/viewer/view/nav";
import "@/galois/viewer/view/styles.css";
import React, { useState } from "react";
import * as ReactDOM from "react-dom";

const Index: React.FunctionComponent<{}> = ({}) => {
  const [asset, setAsset] = useState<Asset>();
  const reload = reloadCountAndButton();

  return (
    <div className="page">
      <Nav setAsset={setAsset} />
      {reload.button}
      <ReloadCountContext.Provider value={{ reloadCount: reload.count }}>
        <AssetView
          asset={asset}
          buildAssetFn={(asset) => clientApi().build(asset)}
        />
      </ReloadCountContext.Provider>
    </div>
  );
};

ReactDOM.render(<Index />, document.getElementById("app"));

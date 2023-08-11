import {
  reloadCountAndButton,
  ReloadCountContext,
} from "@/galois/components/helpers/ReloadButton";
import type { AssetServerConnection } from "@/galois/editor/view/api";
import type { ContentPage } from "@/galois/editor/view/editor_content";
import "antd/dist/antd.css";
import React from "react";

export const Content: React.FunctionComponent<{
  selectedContentPage?: ContentPage;
  assetServer: AssetServerConnection;
}> = ({ selectedContentPage, assetServer }) => {
  const reload = reloadCountAndButton(() => assetServer.clearCache());

  // Need to re-assign to a variable with a capitalized first letter.
  const ContentPageInstance = selectedContentPage;

  if (ContentPageInstance) {
    return (
      <div className="editor-content">
        {reload.button}
        <ReloadCountContext.Provider value={{ reloadCount: reload.count }}>
          <ContentPageInstance build={assetServer.build} />
        </ReloadCountContext.Provider>
      </div>
    );
  } else {
    return <></>;
  }
};

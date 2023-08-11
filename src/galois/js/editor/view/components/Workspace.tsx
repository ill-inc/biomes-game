import type { AssetServerConnection } from "@/galois/editor/view/api";
import { clientApi } from "@/galois/editor/view/api";
import { Content } from "@/galois/editor/view/components/Content";
import { ContentSelector } from "@/galois/editor/view/components/ContentSelector";
import type { ContentPage } from "@/galois/editor/view/editor_content";
import React, { useEffect, useState } from "react";

export const Workspace: React.FunctionComponent<{
  workspaceDir: string;
  onSelectNewWorkspace: () => void;
}> = ({ workspaceDir, onSelectNewWorkspace }) => {
  const [selectedContentPage, setSelectedContentPage] = useState<
    ContentPage | undefined
  >();
  const [assetServer, setAssetServer] = useState<AssetServerConnection | null>(
    null
  );

  // Recreate a new asset server if the workspace directory changes.
  useEffect(() => {
    setAssetServer(null);
    void (async () => {
      setAssetServer(await clientApi().makeAssetServer(workspaceDir));
    })();
  }, [workspaceDir]);

  if (assetServer) {
    return (
      <div className="top-level-with-workspace">
        <div className="main-pane">
          <div className="workspace">
            <div className="left">
              <ContentSelector
                setSelectedContentPage={(x) => setSelectedContentPage(() => x)}
                assetServer={assetServer}
              />
            </div>
            <div className="right">
              <Content
                selectedContentPage={selectedContentPage}
                assetServer={assetServer}
              />
            </div>
          </div>
        </div>
        <div className="status-bar">
          <span className="workspace-folder" onClick={onSelectNewWorkspace}>
            Workspace folder: {workspaceDir ? workspaceDir : "-"}
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="top-level-with-workspace">
        <div className="main-pane">
          <div className="workspace">
            <div className="left"></div>
            <div>Loading asset server...</div>
          </div>
        </div>
        <div className="status-bar">
          <span className="workspace-folder" onClick={onSelectNewWorkspace}>
            Workspace folder: {workspaceDir ? workspaceDir : "-"}
          </span>
        </div>
      </div>
    );
  }
};

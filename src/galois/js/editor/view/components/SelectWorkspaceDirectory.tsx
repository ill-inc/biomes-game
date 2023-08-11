import { clientApi } from "@/galois/editor/view/api";
import { Button } from "antd";
import React, { useState } from "react";

export const SelectWorkspaceDirectory: React.FunctionComponent<{
  setWorkspaceDir: (x: string) => void;
}> = ({ setWorkspaceDir }) => {
  const [pendingLoad, setPendingLoad] = useState<boolean>(false);

  const onLoadWorkspace = () => {
    setPendingLoad(true);
    void (async () => {
      const result = await clientApi().openDirectoryDialog();
      setPendingLoad(false);
      if (!result.canceled) {
        setWorkspaceDir(result.filePaths[0]);
      }
    })();
  };

  return (
    <div className="select-workspace">
      <div className="select-workspace-content">
        <Button
          type="primary"
          disabled={pendingLoad}
          size="large"
          onClick={onLoadWorkspace}
        >
          Select a source asset workspace directory
        </Button>
        <div className="instructions">
          Use the{" "}
          <a
            onClick={() => {
              clientApi().openExternal(
                "https://www.google.com/drive/download/"
              );
            }}
          >
            {" "}
            Google Drive App{" "}
          </a>
          to sync the{" "}
          <a
            onClick={() => {
              clientApi().openExternal(
                "https://drive.google.com/drive/folders/1Y5LwX4KL-xV7SP6pQu7_6i0fzXamrPvb"
              );
            }}
          >
            Biomes Source Asset Repository
          </a>{" "}
          to a directory on your computer. After that, choose that directory as
          your workspace directory.
        </div>
        <div className="instructions">
          All source assets used by the editor will be sourced from your
          workspace directory.
        </div>
        <div className="instructions">
          If you want to experiment on changes without affecting the contents of
          the Google Drive folder, you can copy the contents into a new local
          directory and switch your workspace directory to that.
        </div>
      </div>
    </div>
  );
};

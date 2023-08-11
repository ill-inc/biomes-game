import { clientApi } from "@/galois/editor/view/api";
import { SelectWorkspaceDirectory } from "@/galois/editor/view/components/SelectWorkspaceDirectory";
import { Workspace } from "@/galois/editor/view/components/Workspace";
import { getWorkspaceDirectoryOpenState } from "@/galois/editor/view/open_workspace_dialog";
import React, { useState } from "react";

interface SavedUserData {
  workspaceDirectory: string;
}

export const App: React.FunctionComponent<{}> = ({}) => {
  const [workspaceDir, setWorkspaceDir] = useState<string | undefined>(() => {
    // Check if we saved a default workspace directory from a previous session.
    const savedUserData = clientApi().readUserData();
    if (!savedUserData || !("workspaceDirectory" in savedUserData)) {
      return undefined;
    }
    const userDataWorkspaceDir = (savedUserData as unknown as SavedUserData)
      .workspaceDirectory;
    if (!clientApi().existsSync(userDataWorkspaceDir)) {
      return undefined;
    }

    return userDataWorkspaceDir;
  });

  const setWorkspaceAndSaveSetting = (dir: string) => {
    setWorkspaceDir(dir);
    void clientApi().writeUserData({ workspaceDirectory: dir });
  };
  const workspaceDirectoryOpenState = getWorkspaceDirectoryOpenState(
    (dir: string) => {
      setWorkspaceAndSaveSetting(dir);
    }
  );

  const topLevelContent = workspaceDir ? (
    <Workspace
      workspaceDir={workspaceDir}
      onSelectNewWorkspace={workspaceDirectoryOpenState.openWorkspaceDirectory}
    />
  ) : (
    <SelectWorkspaceDirectory setWorkspaceDir={setWorkspaceAndSaveSetting} />
  );

  return <div className="top-level">{topLevelContent}</div>;
};

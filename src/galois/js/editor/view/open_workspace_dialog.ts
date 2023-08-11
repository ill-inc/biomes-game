import { clientApi } from "@/galois/editor/view/api";
import { useState } from "react";

export const getWorkspaceDirectoryOpenState = (
  workspaceOpened: (x: string) => void
) => {
  const [loadPending, setLoadPending] = useState<boolean>(false);

  return {
    loadPending: loadPending,
    openWorkspaceDirectory: () => {
      setLoadPending(true);
      void (async () => {
        const result = await clientApi().openDirectoryDialog();
        setLoadPending(false);
        if (!result.canceled) {
          workspaceOpened(result.filePaths[0]);
        }
      })();
    },
  };
};

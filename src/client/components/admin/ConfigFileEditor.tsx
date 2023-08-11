import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import styles from "@/client/styles/admin.npcs.module.css";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import type {
  FetchConfigDataSource,
  FetchConfigRequest,
  FetchConfigResponse,
} from "@/pages/api/admin/fetch_config";
import type {
  PublishConfigRequest,
  PublishConfigResponse,
} from "@/pages/api/admin/publish_config";
import { log } from "@/shared/logging";

import { jsonPost } from "@/shared/util/fetch_helpers";
import { useCallback, useState } from "react";
import type * as z from "zod";

type SaveStatus = { kind: "saving" } | PublishConfigResponse;

const ShowSaveStatus = ({
  saveStatus,
  back,
}: {
  saveStatus: SaveStatus;
  back: () => void;
}) => {
  const message: JSX.Element = (() => {
    switch (saveStatus.kind) {
      case "saving":
        return (
          <>
            <div>Publishing...</div>
            <MaybeGridSpinner isLoading={true}></MaybeGridSpinner>
          </>
        );
      case "githubSuccess":
        const url = `https://github.com/ill-inc/biomes/pull/${saveStatus.prNumber}`;
        return (
          <>
            <div>Successfully published to GitHub as a Pull Request.</div>
            <div>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </div>
            <div>
              Published changes will not be reflected in game or in the admin
              tool until the pull request above is merged and deployed.
            </div>
            <div>
              You must manually merge the PR by clicking on the link above.
            </div>
          </>
        );
      case "localSuccess":
        return (
          <>
            <div>
              Successfully published changes to local file{" "}
              {`"${saveStatus.path}"`}.
            </div>
            <DialogButton onClick={back}>Back</DialogButton>
          </>
        );
      case "error":
        return (
          <>
            <div>Error while saving: {saveStatus.message}</div>
            <DialogButton onClick={back}>Back</DialogButton>
          </>
        );
    }
  })();

  return <div className={styles["save-status"]}>{message}</div>;
};

export type MakeEditorComponent<
  S extends z.ZodTypeAny,
  V extends z.infer<S>
> = (params: {
  value: V;
  onChangeRequest: (newValue: V) => void;
}) => JSX.Element;

export const ConfigFileEditSession = <
  S extends z.ZodTypeAny,
  V extends z.infer<S>
>({
  initialValue,
  dataSource,
  save,
  makeEditorComponent,
}: {
  initialValue: V;
  dataSource: FetchConfigDataSource;
  save: (v: V) => Promise<PublishConfigResponse>;
  makeEditorComponent: MakeEditorComponent<S, V>;
}) => {
  const [value, setValue] = useState({ ...initialValue });
  const [valueVersion, setValueVersion] = useState(0);
  const [valueLastSaved, setValueLastSaved] = useState({ ...initialValue });
  const [lastSavedVersion, setLastSavedVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | undefined>(
    undefined
  );

  const onChangeRequest = useCallback((v: typeof value) => {
    try {
      setValue((_prev) => v);
      setValueVersion((prev) => prev + 1);
    } catch (e) {
      log.warn(`Validation error: ${e}`);
    }
  }, []);

  return saveStatus ? (
    <ShowSaveStatus
      saveStatus={saveStatus}
      back={() => {
        setSaveStatus(undefined);
      }}
    ></ShowSaveStatus>
  ) : (
    <>
      <div className={styles["top-menu"]}>
        <DialogButton
          onClick={() => {
            setValue({ ...valueLastSaved });
            setValueVersion(lastSavedVersion);
          }}
        >
          Reset Changes
        </DialogButton>
        <DialogButton
          disabled={valueVersion === lastSavedVersion}
          onClick={() => {
            const currentVersion = valueVersion;
            setSaveStatus({ kind: "saving" });
            save(value)
              .then((results) => {
                if (results.kind === "error") {
                  setSaveStatus(results);
                } else {
                  setSaveStatus(results);
                  setLastSavedVersion(currentVersion);
                  setValueLastSaved({ ...value });
                }
              })
              .catch((e) => setSaveStatus({ kind: "error", message: `${e}` }));
          }}
        >
          {(() => {
            switch (dataSource) {
              case "github":
                return "Publish to GitHub";
              case "local":
                return "Save to local filesystem";
            }
          })()}
        </DialogButton>
      </div>
      {makeEditorComponent({ value, onChangeRequest })}
    </>
  );
};

export const ConfigFileEditor = <S extends z.ZodTypeAny, V extends z.infer<S>>({
  configFilePath,
  parseConfigFile,
  saveConfigFile,
  makeEditorComponent,
}: {
  configFilePath: string;
  parseConfigFile: (data: string) => V;
  saveConfigFile: (data: V) => string;
  makeEditorComponent: MakeEditorComponent<S, V>;
}) => {
  const [error, setError] = useState<any>(undefined);
  const initialData = useAsyncInitialDataFetch(async () => {
    const fetchResults = await fetchConfigJson(configFilePath);
    return {
      source: fetchResults.source,
      content: parseConfigFile(fetchResults.data),
      baseCommitSha: fetchResults.baseCommitSha,
    };
  }, setError);

  if (!initialData.data) {
    if (error) {
      return <div>Error while fetching data: {`${error}`}</div>;
    } else {
      return (
        <div className={styles["save-status"]}>
          <div>Fetching data...</div>
          <MaybeGridSpinner isLoading={true}></MaybeGridSpinner>
        </div>
      );
    }
  }

  const data = initialData.data;

  return (
    <ConfigFileEditSession
      makeEditorComponent={makeEditorComponent}
      initialValue={data.content}
      dataSource={initialData.data.source}
      save={async (v: V) => {
        return publishConfigJson(
          saveConfigFile(v),
          configFilePath,
          data.baseCommitSha
        );
      }}
    ></ConfigFileEditSession>
  );
};

async function publishConfigJson(
  data: string,
  path: string,
  baseCommitSha: string | undefined
) {
  const response = await jsonPost<PublishConfigResponse, PublishConfigRequest>(
    "/api/admin/publish_config",
    {
      path,
      data,
      baseCommitSha,
    }
  );

  if (response.kind === "error") {
    throw response.message;
  }

  return response;
}

async function fetchConfigJson(path: string) {
  const response = await jsonPost<FetchConfigResponse, FetchConfigRequest>(
    "/api/admin/fetch_config",
    {
      path,
    }
  );

  if (response.result.kind === "error") {
    throw response.result.message;
  }

  return {
    source: response.source,
    data: response.result.data,
    baseCommitSha: response.result.baseCommitSha,
  } as const;
}

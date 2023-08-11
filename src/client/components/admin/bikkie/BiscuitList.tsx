import { useBikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import type { ListedBiscuit } from "@/client/components/admin/bikkie/search";
import {
  unsavedToListed,
  useBikkieSearch,
} from "@/client/components/admin/bikkie/search";
import { prettySchemaName } from "@/client/components/admin/bikkie/util";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Img } from "@/client/components/system/Img";
import { MaybeGridSpinner } from "@/client/components/system/MaybeGridSpinner";
import styles from "@/client/styles/admin.bikkie.module.css";
import { useEffectWithDebounce } from "@/client/util/hooks";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { compactMap } from "@/shared/util/collections";
import { useCallback, useMemo, useState } from "react";

export const BiscuitListItem: React.FunctionComponent<{
  selected?: BiomesId;
  biscuit: ListedBiscuit;
  onClick: () => void;
  showSchemaPaths?: string[];
}> = ({ selected, biscuit, onClick, showSchemaPaths }) => {
  const filteredSchemas = useMemo(() => {
    if (!showSchemaPaths) {
      return [];
    }
    return biscuit.schemas
      .filter((s) => showSchemaPaths.includes(s))
      .sort((a, b) => a.length - b.length);
  }, [biscuit, showSchemaPaths]);
  return (
    <li
      key={biscuit.id}
      onClick={(e) => {
        onClick();
        e.stopPropagation();
      }}
      className={`${biscuit.id === selected ? styles["selected"] : ""} ${
        biscuit.edited ? styles["edited"] : ""
      } ${styles["search-result"]}`}
    >
      <div className={styles["biscuit-icon"]}>
        <Img src={biscuit.iconUrl} />
      </div>
      <div style={{ width: "100%" }}>
        <label className={styles["name"]}>
          {biscuit.displayName || biscuit.name}
        </label>
        <label className={styles["id"]}>{biscuit.name}</label>
        {showSchemaPaths && filteredSchemas.length > 0 && (
          <div className={styles["biscuit-labels"]}>
            {filteredSchemas.map((path) => (
              <div key={path} className={styles["label"]}>
                {prettySchemaName(path)}
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
};

export const BiscuitList: React.FunctionComponent<{
  selected?: BiomesId;
  biscuits: ListedBiscuit[];
  onClick: (id: BiomesId) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showSchemaPaths?: string[];
}> = ({ selected, biscuits, onClick, header, footer, showSchemaPaths }) => {
  const [view, setView] = useState("list");
  return (
    <div
      className={styles["biscuit-list"]}
      onClick={() => onClick(INVALID_BIOMES_ID)}
    >
      <div className={styles["biscuit-list-header"]}>
        {header}
        <div className={styles["biscuit-list-filters"]}>
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
            }}
          >
            <option value="list">List</option>
            <option value="grid">Grid</option>
          </select>
        </div>
      </div>

      <ul
        className={`${styles["biscuits"]} ${
          view === "grid" ? styles["grid"] : ""
        }`}
      >
        {biscuits.length === 0 && <li>No matching Biscuits</li>}
        {biscuits.map((biscuit) => (
          <BiscuitListItem
            key={biscuit.id}
            selected={selected}
            biscuit={biscuit}
            onClick={() => onClick(biscuit.id)}
            showSchemaPaths={showSchemaPaths}
          />
        ))}
      </ul>
      {footer}
    </div>
  );
};

export const BiscuitNav: React.FunctionComponent<{
  query: string;
  setSelectedId: (id?: BiomesId) => void;
  showSchemaPaths?: string[];
}> = ({ query, setSelectedId, showSchemaPaths }) => {
  const { schemaPath, selected, unsaved, newBiscuit } =
    useBikkieEditorContext();

  const [creatingBiscuit, setCreatingBiscuit] = useState(false);
  const [searchResults, setSearchResults] = useState<ListedBiscuit[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useBikkieSearch();

  // Trigger search on query changes.
  useEffectWithDebounce(
    {
      debounceMs: 100,
      shouldTrigger: () => {
        setLoading(true);
        return true;
      },
      effect: async (signal) => {
        try {
          const results = await performSearch({ query, schemaPath }, signal);
          if (results) {
            setSearchResults(results);
          }
        } finally {
          setLoading(false);
        }
      },
    },
    [unsaved, schemaPath, query]
  );

  const onNewBiscuit = useCallback(async () => {
    if (creatingBiscuit) {
      return;
    }
    setCreatingBiscuit(true);
    try {
      await newBiscuit();
    } finally {
      setCreatingBiscuit(false);
    }
  }, [newBiscuit, creatingBiscuit]);

  // Check if the selected item doesn't match.
  const selectedNotMatching = useMemo(
    () => selected && !searchResults.some((b) => b.id === selected.id),
    [selected, searchResults]
  );

  // Check if there's unsaved work that doesn't match the search results.
  const nonMatchingUnsaved = useMemo(
    () =>
      compactMap(unsaved, ([id, biscuit]) =>
        id !== selected?.id && !searchResults.some((b) => b.id === id)
          ? biscuit
          : undefined
      ),
    [selected, unsaved, searchResults]
  );

  return (
    <BiscuitList
      selected={selected?.id}
      biscuits={searchResults}
      onClick={setSelectedId}
      header={
        <>
          <DialogButton
            extraClassNames="btn-inline"
            disabled={creatingBiscuit}
            onClick={() => fireAndForget(onNewBiscuit())}
          >
            {`New Biscuit`}
          </DialogButton>
          {nonMatchingUnsaved.length > 0 && (
            <div className={styles["nav-unsaved-warning"]}>
              {`You have${
                selectedNotMatching ? " further" : ""
              } unsaved work not matching the search!`}
              <ul>
                {nonMatchingUnsaved.map((b) => (
                  <li key={b.id} onClick={() => setSelectedId(b.id)}>
                    {b.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedNotMatching && (
            <div className={styles["nav-selected-warning"]}>
              Selected Biscuit not matching the search:
              <BiscuitListItem
                selected={selected?.id}
                biscuit={unsavedToListed(selected!, unsaved.has(selected!.id))}
                onClick={() => setSelectedId(selected!.id)}
                showSchemaPaths={showSchemaPaths}
              />
            </div>
          )}
        </>
      }
      footer={<MaybeGridSpinner isLoading={loading} />}
      showSchemaPaths={showSchemaPaths}
    />
  );
};

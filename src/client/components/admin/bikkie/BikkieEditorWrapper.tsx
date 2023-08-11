import { AdminPage } from "@/client/components/admin/AdminPage";
import type { NewBiscuitConfig } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { BikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { BiscuitEditor } from "@/client/components/admin/bikkie/BiscuitEditor";
import { BiscuitNav } from "@/client/components/admin/bikkie/BiscuitList";
import type {
  BiscuitUpdate,
  CreateBiscuitRequest,
  SaveBiscuitsRequest,
} from "@/client/components/admin/bikkie/requests";
import {
  fetchBiscuit,
  zCreateBiscuitResponse,
} from "@/client/components/admin/bikkie/requests";
import type { NamedBiscuitEdits } from "@/client/components/admin/bikkie/unsaved";
import { UnsavedBiscuit } from "@/client/components/admin/bikkie/unsaved";
import { prettySchemaName } from "@/client/components/admin/bikkie/util";
import { AsyncDefaultReactContext } from "@/client/components/admin/zod_form_synthesis/AsyncDefault";
import { useBikkieLoaded } from "@/client/components/hooks/client_hooks";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import styles from "@/client/styles/admin.bikkie.module.css";
import { cleanListener } from "@/client/util/helpers";
import { useEffectAsyncFetcher } from "@/client/util/hooks";
import type { AnyBikkieSchema } from "@/shared/bikkie/core";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiscuitAttributeAssignment } from "@/shared/bikkie/tray";
import { resolveAssignment } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { removeFalsyInPlace, removeNilishInPlace } from "@/shared/util/object";
import type { AsyncDefaultContext } from "@/shared/zfs/async_default";
import {
  createAsyncDefaultContext,
  createDefault,
} from "@/shared/zfs/async_default";
import { ok } from "assert";
import { mapValues } from "lodash";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

function unsavedToSaveRequest(
  trayName: string,
  unsaved: ReadonlyMap<BiomesId, UnsavedBiscuit>
): SaveBiscuitsRequest | undefined {
  const updates: BiscuitUpdate[] = [];
  for (const [id, biscuit] of unsaved) {
    if (!biscuit.hasChanges()) {
      continue;
    }
    updates.push({
      id,
      extendedFrom:
        biscuit.updates?.extendedFrom ?? biscuit.current?.extendedFrom,
      name: biscuit.updates?.name,
      attributes: biscuit.updates?.attributes,
    });
  }
  if (updates.length === 0) {
    return;
  }
  return { trayName, updates };
}

async function attributesForNewBiscuit(
  asyncDefaultContext: AsyncDefaultContext,
  schema: AnyBikkieSchema | undefined,
  extendedFrom: UnsavedBiscuit | undefined
) {
  const entries: [number, BiscuitAttributeAssignment][] = Object.entries(
    extendedFrom?.attributes ?? {}
  ).map(([k, v]) => [
    parseInt(k),
    v?.kind === "inherit"
      ? v
      : { kind: "inherit", from: extendedFrom!.id, value: v },
  ]);
  const work: Promise<unknown>[] = [];
  for (const attributeName of schema?.attributes ?? []) {
    const attribute = attribs.byName.get(attributeName)!;
    if (extendedFrom?.attributes?.[attribute.id]) {
      continue;
    }
    work.push(
      (async () => {
        entries.push([
          attribute.id,
          {
            kind: "constant",
            value: await createDefault(asyncDefaultContext, attribute.type()),
          },
        ]);
      })()
    );
  }
  if (work.length > 0) {
    await Promise.all(work);
  }
  const attributes = Object.fromEntries(entries);
  if (attributes[attribs.abstract.id]) {
    delete attributes[attribs.abstract.id];
  }
  return attributes;
}

export const BikkieEditorWrapper: React.FunctionComponent<
  PropsWithChildren<{
    schema?: SchemaPath;
    selectedId?: BiomesId;
    setSelectedId: (id?: BiomesId) => void;
  }>
> = ({ children, schema: schemaPath, selectedId, setSelectedId }) => {
  const schema = bikkie.getSchema(schemaPath);
  const [error, setError] = useError();
  const [unsaved, setUnsaved] = useState<ReadonlyMap<BiomesId, UnsavedBiscuit>>(
    new Map()
  );

  const [selectedBiscuit, setSelectedBiscuit] = useState<
    UnsavedBiscuit | undefined
  >(undefined);

  const [queryCache, setQueryCache] = useState(new Map());

  const asyncDefaultContext = useMemo(createAsyncDefaultContext, []);
  const clearQueryCache = useCallback(() => setQueryCache(new Map()), []);

  useEffectAsyncFetcher(
    async (signal) => {
      setError(undefined);
      if (!selectedId) {
        return;
      }
      const edited = unsaved.get(selectedId);
      if (edited) {
        return edited;
      }
      try {
        return await fetchBiscuit(selectedId, signal);
      } catch (e) {
        if (!signal?.aborted) {
          setError(e);
        }
      }
    },
    setSelectedBiscuit,
    [unsaved, selectedId]
  );

  // Show a warning on closing if unsaved has contents.
  useEffect(
    () =>
      cleanListener(window, {
        beforeunload: (e) => {
          if (unsaved.size > 0) {
            e.preventDefault();
            e.returnValue =
              "You have unsaved changes, are you sure you want to exit?";
          }
        },
      }),
    [unsaved]
  );

  const newBiscuit = useCallback(
    async (config?: NewBiscuitConfig) => {
      try {
        const { id, name } = await zjsonPost(
          "/api/admin/bikkie/create",
          {
            proposedName: config?.proposedName,
          } satisfies CreateBiscuitRequest,
          zCreateBiscuitResponse
        );

        const extendedFromBiscuit = config?.extendedFrom
          ? await fetchBiscuit(config.extendedFrom, undefined)
          : undefined;

        const attributes = {
          ...(await attributesForNewBiscuit(
            asyncDefaultContext,
            schema,
            extendedFromBiscuit
          )),
          // Instance-specific creates (typically the duplicates)
          ...config?.attributes,
        };

        const biscuit = new UnsavedBiscuit(id, "", undefined, {
          name,
          extendedFrom: config?.extendedFrom,
          attributes: removeFalsyInPlace(
            mapValues(attributes, (a) =>
              resolveAssignment(attributes, a) ? a : undefined
            ) as Record<number, BiscuitAttributeAssignment>
          ),
        });

        const updated = new Map(unsaved);
        updated.set(biscuit.id, biscuit);
        setUnsaved(updated);
        setSelectedId(id);
      } catch (e) {
        setError(e);
      }
    },
    [asyncDefaultContext, unsaved, schema]
  );

  const editBiscuit = useCallback(
    (edits: NamedBiscuitEdits) => {
      ok(selectedBiscuit?.id === edits.id);
      // You cannot change the parent biscuit with this call, that is more
      // expensive to do.
      ok(
        edits.extendedFrom === undefined ||
          edits.extendedFrom !== selectedBiscuit.extendedFrom
      );
      const updated = selectedBiscuit.withEdits({
        name: edits.name ?? selectedBiscuit.updates?.name,
        attributes: removeNilishInPlace({
          ...selectedBiscuit.updates?.attributes,
          ...edits.attributes,
        }),
      });
      const newUnsaved = new Map(unsaved);
      if (!updated.hasChanges()) {
        newUnsaved.delete(edits.id);
      } else {
        newUnsaved.set(edits.id, updated);
      }
      setSelectedBiscuit(updated);
      setUnsaved(newUnsaved);
    },
    [selectedBiscuit, unsaved]
  );

  const discardChanges = useCallback(() => {
    if (selectedBiscuit) {
      if (selectedBiscuit?.current === undefined) {
        // It was a new Biscuit, but it's gone now.
        setSelectedBiscuit(undefined);
      } else {
        // Remove any unapplied changes.
        setSelectedBiscuit(selectedBiscuit.withEdits());
      }
    }
    clearQueryCache();
    setUnsaved(new Map());
  }, [selectedBiscuit, unsaved]);

  const [saving, setSaving] = useState(false);
  const [trayName, setTrayName] = useState("");

  const saveChanges = useCallback(async () => {
    const request = unsavedToSaveRequest(trayName, unsaved);
    if (!request) {
      return;
    }
    setSaving(true);
    try {
      try {
        await zjsonPost("/api/admin/bikkie/save", request, z.void());
        if (selectedBiscuit) {
          try {
            setSelectedBiscuit(await fetchBiscuit(selectedBiscuit.id));
          } catch (e) {
            log.error("Failed to fetch biscuit", { e });
            setSelectedBiscuit(undefined);
          }
        }
        clearQueryCache();
        setUnsaved(new Map());
        setTrayName("");
      } catch (e) {
        setError(e);
      }
    } finally {
      setSaving(false);
    }
  }, [unsaved, saving, trayName]);

  return (
    <AsyncDefaultReactContext.Provider value={asyncDefaultContext}>
      <BikkieEditorContext.Provider
        value={{
          schemaPath,
          selected: selectedBiscuit,
          unsaved,
          newBiscuit,
          editBiscuit,
          queryCache,
        }}
      >
        <div className={styles["bikkie-editor"]}>
          <MaybeError error={error} />
          {children}
          {unsaved.size > 0 && (
            <>
              <div className={styles["unsaved"]}>
                <div className="divider" />
                <div className={styles["unsaved-actions"]}>
                  <input
                    type="text"
                    placeholder={`Notes (optional)`}
                    value={trayName}
                    onChange={(e) => setTrayName(e.target.value)}
                  />

                  <div className={styles["unsaved-buttons"]}>
                    <DialogButton
                      disabled={saving}
                      type="destructive"
                      onClick={() => discardChanges()}
                    >
                      Discard
                    </DialogButton>

                    <DialogButton
                      disabled={saving}
                      type="primary"
                      onClick={() => fireAndForget(saveChanges())}
                    >
                      Save
                    </DialogButton>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </BikkieEditorContext.Provider>
    </AsyncDefaultReactContext.Provider>
  );
};

export const SchemaSelector: React.FunctionComponent<{
  schemas: SchemaPath[];
  schema?: SchemaPath;
  onChange(schema: undefined | SchemaPath): void;
}> = ({ schemas, schema, onChange }) => {
  return (
    <DialogTypeaheadInput
      extraClassNames={`${styles["schema-path"]} w-[400px]`}
      options={["/" as SchemaPath, ...schemas]}
      value={schema}
      getDisplayName={(e) => (e === "/" ? "All" : e)}
      onChange={(e) => onChange(e)}
    />
  );
};

export const SchemaSpecificPage: React.FunctionComponent<{
  selected?: [SchemaPath | undefined, BiomesId | undefined];
  schemas?: SchemaPath[];
  onChange?: (schema?: SchemaPath, id?: BiomesId) => void;
}> = ({ selected, schemas, onChange }) => {
  schemas ??= bikkie.allSchemas().map(([path]) => path);

  // This should go away post migration.
  const bikkieLoaded = useBikkieLoaded();

  const [searchString, setSearchString] = useState("");
  const [selectedId, setSelectedId] = useState<BiomesId | undefined>(undefined);
  const [schema, setSchema] = useState<SchemaPath | undefined>(undefined);

  useEffect(() => {
    if (selected) {
      setSchema(selected[0]);
      setSelectedId(selected[1]);
    } else {
      setSchema(schemas && schemas.length === 1 ? schemas[0] : undefined);
      setSelectedId(undefined);
    }
  }, [selected, schemas.join(",")]);

  useEffect(() => {
    onChange?.(schema, selectedId);
  }, [onChange, schema, selectedId]);

  const searchPlaceholderString =
    schema == "/" ? "Search all" : `Search ${prettySchemaName(schema)}`;

  return (
    <AdminPage dontScroll>
      {bikkieLoaded && (
        <BikkieEditorWrapper
          schema={schema}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        >
          <div className={styles["search-bar"]}>
            {schemas.length > 1 && (
              <SchemaSelector
                schemas={schemas}
                schema={schema}
                onChange={setSchema}
              />
            )}
            <input
              type="text"
              placeholder={searchPlaceholderString}
              value={searchString}
              onChange={(e) => {
                setSearchString(e.target.value);
              }}
            />
          </div>
          <div className={styles["main-editor"]}>
            <BiscuitNav
              query={searchString}
              setSelectedId={setSelectedId}
              showSchemaPaths={
                schemas.length > 1
                  ? schemas.filter(
                      (s) => s && bikkie.getSchema(s)!.attributes.length > 0
                    )
                  : undefined
              }
            />
            <BiscuitEditor />
          </div>
        </BikkieEditorWrapper>
      )}
    </AdminPage>
  );
};

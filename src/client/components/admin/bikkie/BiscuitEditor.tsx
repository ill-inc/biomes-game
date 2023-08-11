import { AttributeValueEditor } from "@/client/components/admin/bikkie/attributes/AttributeValueEditor";
import { useBikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { BiscuitModelPreview } from "@/client/components/admin/bikkie/BiscuitModelPreview";
import { EditableText } from "@/client/components/admin/bikkie/EditableText";
import { useBiscuit } from "@/client/components/admin/bikkie/search";
import type {
  NamedBiscuitEdits,
  UnsavedBiscuit,
} from "@/client/components/admin/bikkie/unsaved";
import { nameForAttribute } from "@/client/components/admin/bikkie/util";
import { AsyncDefaultReactContext } from "@/client/components/admin/zod_form_synthesis/AsyncDefault";
import type { DialogButtonType } from "@/client/components/system/DialogButton";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { Img } from "@/client/components/system/Img";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { AnyBikkieAttribute } from "@/shared/bikkie/attributes";
import type { AnyBikkieSchema } from "@/shared/bikkie/core";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { isBinaryAttributeFor } from "@/shared/bikkie/schema/binary";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { bikkieTrue } from "@/shared/bikkie/schema/types";
import type {
  BiscuitAttributeAssignment,
  InferenceAssignment,
} from "@/shared/bikkie/tray";
import { resolveAssignment } from "@/shared/bikkie/tray";
import { VALID_BISCUIT_NAME } from "@/shared/bikkie/util";
import { fireAndForget } from "@/shared/util/async";
import { createDefault } from "@/shared/zfs/async_default";
import { ok } from "assert";
import { partition, sortBy } from "lodash";
import type { PropsWithChildren } from "react";
import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const xSymbol = "✖";

export const AttributeAssignmentButton: React.FunctionComponent<
  PropsWithChildren<{
    onClick: () => void;
    type?: DialogButtonType | undefined;
  }>
> = ({ children, onClick, type }) => {
  return (
    <div className={styles["attribute-assignment-button"]}>
      <DialogButton type={type} onClick={onClick}>
        {children}
      </DialogButton>
    </div>
  );
};

export const BiscuitAttributeAssignmentButtons: React.FunctionComponent<{
  id: number;
  original: BiscuitAttributeAssignment | undefined;
  current: BiscuitAttributeAssignment;
  hasParent?: boolean;
  resetToConstant: () => void;
  onChange: (edit: BiscuitAttributeAssignment | null) => void;
}> = ({ id, original, current, hasParent, resetToConstant, onChange }) => {
  const attribute = attribs.byId.get(id);
  if (!attribute) {
    return <></>;
  }
  return (
    <>
      {current !== original && original && (
        <AttributeAssignmentButton onClick={() => onChange(original)}>
          Undo
        </AttributeAssignmentButton>
      )}
      {hasParent && (
        <AttributeAssignmentButton
          type="special"
          onClick={() => onChange(null)}
        >
          Inherit
        </AttributeAssignmentButton>
      )}
      {current && current.kind !== "unassign" && (
        <AttributeAssignmentButton
          type="destructive"
          onClick={() => onChange({ kind: "unassign" })}
        >
          Remove
        </AttributeAssignmentButton>
      )}
      {current?.kind !== "infer" && (
        <AttributeAssignmentButton
          type="special"
          onClick={() => onChange({ kind: "infer", rule: "" })}
        >
          Infer
        </AttributeAssignmentButton>
      )}
      {current?.kind === "infer" && (
        <AttributeAssignmentButton
          type="special"
          onClick={() => resetToConstant()}
        >
          Manual
        </AttributeAssignmentButton>
      )}
    </>
  );
};

// TODO: Pull ruleset from somewhere.
interface ClientInferenceRule {
  readonly name: string;
  canInfer: (attribute: AnyBikkieAttribute) => boolean;
}

const INFERENCE_RULES: ClientInferenceRule[] = [
  {
    name: "renderIcon",
    canInfer: (attribute) => isBinaryAttributeFor(attribute.type(), "png"),
  },
  {
    name: "itemMesh",
    canInfer: (attribute) => isBinaryAttributeFor(attribute.type(), "itemMesh"),
  },
  {
    name: "placeableMesh",
    canInfer: (attribute) => isBinaryAttributeFor(attribute.type(), "gltf"),
  },
];

const BiscuitAttributeInferenceEditor: React.FunctionComponent<{
  id: number;
  current: InferenceAssignment;
  onChange: (edit: BiscuitAttributeAssignment | null) => void;
}> = ({ id, current, onChange }) => {
  const relevantInferenceRules = useMemo(() => {
    const attribute = attribs.byId.get(id);
    ok(attribute);
    const filtered = INFERENCE_RULES.filter(({ canInfer }) =>
      canInfer(attribute)
    );
    if (current.rule && !filtered.some((r) => r.name === current.rule)) {
      const unexpected = INFERENCE_RULES.find((r) => r.name === current.rule);
      if (unexpected) {
        filtered.push(unexpected);
      }
    }
    return filtered;
  }, [current]);

  return (
    <div className={styles["inferred-attribute"]}>
      <div>&#x2699;&#xFE0F; Inferred by running the following named rule:</div>
      <select
        value={current.rule || ""}
        onChange={(e) => onChange({ ...current, rule: e.target.value })}
      >
        <option value="">None</option>
        {relevantInferenceRules.map(({ name }) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};

export const BiscuitAttributeAssignmentEditor: React.FunctionComponent<{
  id: number;
  current: BiscuitAttributeAssignment;
  onChange: (edit: BiscuitAttributeAssignment | null) => void;
}> = ({ id, current, onChange }) => {
  const attribute = attribs.byId.get(id);
  if (!attribute || current === null) {
    return <></>;
  }
  switch (current.kind) {
    case "unassign":
      return (
        <div className={styles["unassigned-attribute"]}>
          <div>This attribute was removed.</div>
        </div>
      );
    case "constant":
      return (
        <AttributeValueEditor
          attribute={attribute}
          value={current.value}
          onChange={(value) => onChange({ kind: "constant", value })}
        />
      );
    case "inherit":
      return (
        <div className={styles["inherited-attribute"]}>
          <div>Inherited from parent Biscuit</div>
          <BiscuitAttributeAssignmentEditor
            id={id}
            current={current.value}
            onChange={onChange}
          />
        </div>
      );
    case "infer":
      return (
        <BiscuitAttributeInferenceEditor
          id={id}
          current={current}
          onChange={onChange}
        />
      );
  }
};

export const BiscuitAttributeEditor: React.FunctionComponent<{
  hasParent?: boolean;
  within: Omit<NamedBiscuitEdits, "id"> | undefined;
  id: number;
  attribute: AnyBikkieAttribute;
  current: BiscuitAttributeAssignment;
  original: BiscuitAttributeAssignment | undefined;
  resetToConstant: (attribute: AnyBikkieAttribute) => Promise<void>;
  onChange: (edit: BiscuitAttributeAssignment | null) => void;
}> = ({
  hasParent,
  within,
  id,
  attribute,
  current,
  original,
  resetToConstant,
  onChange,
}) => {
  if (
    (current === null || current.kind === "unassign") &&
    (!within || resolveAssignment(within, original) === undefined)
  ) {
    // The deleted attribute didn't originally exist, so pretend it doesn't.
    return <></>;
  }

  const name = nameForAttribute(attribute);
  return (
    <div className={styles["attribute-container"]}>
      <div
        className={
          styles["attribute-key"] +
          (current !== original ? ` ${styles["edited-attribute"]}` : "")
        }
      >
        {attribute.help ? (
          <Tooltipped
            tooltip={attribute.help}
            wrapperExtraClass={styles["tooltipped"]}
          >
            <label className={styles["attribute-title"]}>{name}</label>
          </Tooltipped>
        ) : (
          <label className={styles["attribute-title"]}>{name}</label>
        )}
        <BiscuitAttributeAssignmentButtons
          id={id}
          original={original}
          current={current}
          onChange={onChange}
          hasParent={hasParent}
          resetToConstant={() => fireAndForget(resetToConstant(attribute))}
        />
      </div>
      <div className={styles["attribute-assignment"]}>
        {attribute.description && (
          <div className={styles["attribute-description"]}>
            {attribute.description}
          </div>
        )}
        <BiscuitAttributeAssignmentEditor
          id={id}
          current={current}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

type BiscuitAttributeDelta = {
  attribute: AnyBikkieAttribute;
  current: BiscuitAttributeAssignment;
  original: BiscuitAttributeAssignment | undefined;
};

export const BiscuitAttributesEditor: React.FunctionComponent<{
  selected: UnsavedBiscuit;
  attributes: BiscuitAttributeDelta[];
  resetToConstant: (attribute: AnyBikkieAttribute) => Promise<void>;
  editAttributes: (edit: Omit<NamedBiscuitEdits, "id">) => void;
}> = ({ selected, attributes, resetToConstant, editAttributes }) => {
  return (
    <>
      {attributes.map(({ attribute, current, original }) => {
        return (
          <BiscuitAttributeEditor
            key={attribute.id}
            hasParent={!!selected.extendedFrom}
            within={selected.current}
            id={attribute.id}
            attribute={attribute}
            current={current}
            original={original}
            resetToConstant={resetToConstant}
            onChange={(edit) =>
              editAttributes({
                [attribute.id]: edit,
              })
            }
          />
        );
      })}
    </>
  );
};

export const BiscuitLabels: React.FunctionComponent<{
  selected?: UnsavedBiscuit;
  labels: BiscuitAttributeDelta[];
  editAttributes: (edit: Omit<NamedBiscuitEdits, "id">) => void;
}> = ({ selected, labels, editAttributes }) => {
  const extendedFrom = useBiscuit(selected?.extendedFrom);
  if (labels.length === 0 && !selected?.extendedFrom) {
    return <></>;
  }
  return (
    <div className={styles["biscuit-labels"]}>
      {extendedFrom && (
        <div className={styles["extended-from"]}>
          <Tooltipped tooltip={`Extended from ${extendedFrom.name}`}>
            {extendedFrom?.displayName ?? extendedFrom?.name ?? "???"}
          </Tooltipped>
        </div>
      )}
      {labels.map(({ attribute, original, current }) => (
        <div
          className={
            styles["label"] +
            (original !== current
              ? resolveAssignment({}, current) === undefined
                ? ` ${styles["unassign"]}`
                : ` ${styles["edited"]}`
              : "")
          }
          key={attribute.id}
        >
          <label>
            {attribute.help ? (
              <Tooltipped tooltip={attribute.help}>{attribute.name}</Tooltipped>
            ) : (
              attribute.name
            )}
          </label>
          <button
            onClick={() =>
              editAttributes({
                [attribute.id]: { kind: "unassign" },
              })
            }
          >
            {xSymbol}
          </button>
        </div>
      ))}
    </div>
  );
};

interface AttributeGroup {
  name: string;
  filter?: (
    schema: AnyBikkieSchema | undefined,
    attribute: AnyBikkieAttribute
  ) => boolean;
}

const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    name: "Required Attributes",
    filter: (schema, attribute) =>
      !!schema?.attributes.includes(attribute.name),
  },
  {
    name: "Recommended Attributes",
    filter: (schema, attribute) =>
      !!schema?.recommendedAttributes.includes(attribute.name),
  },
  {
    name: "Visuals",
    filter: (_schema, attribute) =>
      (
        [
          attribs.vox.id,
          attribs.mesh.id,
          attribs.worldMesh.id,
          attribs.iconSettings.id,
          attribs.icon.id,
          attribs.paletteColor.id,
          attribs.transform.id,
          attribs.attachmentTransform.id,
          attribs.animations.id,
        ] as number[]
      ).includes(attribute.id),
  },
  {
    name: "Attributes",
  },
];

export function sortNameForAttribute(attribute: AnyBikkieAttribute) {
  const ret = nameForAttribute(attribute);
  if (attribute.id === attribs.abstract.id) {
    return "zzzzzz";
  }
  return ret;
}

export const BiscuitEditor: React.FunctionComponent<{
  narrowMode?: boolean;
}> = ({ narrowMode }) => {
  const { schemaPath, selected, editBiscuit, newBiscuit } =
    useBikkieEditorContext();
  const asyncDefaultContext = useContext(AsyncDefaultReactContext);
  const merged = useMemo(() => selected?.attributes ?? {}, [selected]);

  const editAttributes = useCallback(
    (edit: Omit<NamedBiscuitEdits, "id">) => {
      ok(selected, "No biscuit selected");
      editBiscuit({
        id: selected.id,
        attributes: edit,
      });
    },
    [selected]
  );

  const [addingAttribute, setAddingAttribute] = useState(false);
  const addAttribute = useCallback(
    async (attribute: AnyBikkieAttribute, noAutoInference?: boolean) => {
      if (!noAutoInference && attribute.defaultToInferenceRule) {
        editAttributes({
          [attribute.id]: {
            kind: "infer",
            rule: attribute.defaultToInferenceRule,
          },
        });
        return;
      }
      if (addingAttribute) {
        return;
      }
      setAddingAttribute(true);
      try {
        editAttributes({
          [attribute.id]: {
            kind: "constant",
            value: await createDefault(asyncDefaultContext, attribute.type()),
          },
        });
      } finally {
        setAddingAttribute(false);
      }
    },
    [asyncDefaultContext, editAttributes]
  );

  const allUnusedAttributes = useMemo(
    () =>
      sortBy(
        attribs.all.filter((attribute) => {
          if (!(attribute.id in merged)) {
            return true;
          }
          const assignment = merged[attribute.id];
          if (assignment?.kind === "inherit") {
            return true;
          }
          return resolveAssignment(merged, assignment) === undefined;
        }),
        (e) => sortNameForAttribute(e)
      ),
    [merged]
  );

  const schema = useMemo(() => bikkie.getSchema(schemaPath), [schemaPath]);

  const schemaMissingAttributes = useMemo(
    () =>
      schema
        ? (schema.attributes
            .map((attributeName: string) => attribs.byName.get(attributeName)!)
            .filter(
              (a: AnyBikkieAttribute) =>
                resolveAssignment(merged, merged[a.id]) === undefined
            ) as AnyBikkieAttribute[])
        : [],
    [merged, schema]
  );

  const [addingAllMissing, setAddingAllMissing] = useState(false);
  const addMissingAttributes = useCallback(async () => {
    if (addingAllMissing) {
      return;
    }
    setAddingAllMissing(true);
    try {
      editAttributes(
        Object.fromEntries(
          await Promise.all(
            schemaMissingAttributes.map(async (a) => [
              a.id,
              {
                kind: "constant",
                value: createDefault(asyncDefaultContext, a.type()),
              },
            ])
          )
        )
      );
    } finally {
      setAddingAllMissing(false);
    }
  }, [asyncDefaultContext, editAttributes, schemaMissingAttributes]);

  const [labels, attributes] = useMemo(() => {
    const [labels, attributes] = partition(
      Object.entries(merged)
        .map(([key, current]) => {
          const id = parseInt(key);
          return {
            attribute: attribs.byId.get(id)!,
            current,
            original: selected?.current?.attributes[id],
          } as BiscuitAttributeDelta;
        })
        .filter(({ attribute }) => attribute),
      ({ attribute }) => attribute.type() === bikkieTrue
    );
    return [
      labels.filter(
        ({ current, original }) =>
          current !== original || resolveAssignment({}, current) !== undefined
      ),
      attributes,
    ];
  }, [selected, merged, schema]);

  const schemaSortKeys = useMemo(
    () =>
      new Map(
        ((schema?.attributes as string[]) || []).map((name, i) => [name, i])
      ),
    [schema]
  );

  const groups = useMemo(() => {
    const groups: BiscuitAttributeDelta[][] = ATTRIBUTE_GROUPS.map(() => []);
    for (const attributeDelta of attributes) {
      for (let i = 0; i < ATTRIBUTE_GROUPS.length; ++i) {
        const group = ATTRIBUTE_GROUPS[i];
        if (!group.filter || group.filter(schema, attributeDelta.attribute)) {
          groups[i].push(attributeDelta);
          break;
        }
      }
    }
    for (const group of groups) {
      sortBy(group, [
        ({ attribute: { name } }) => schemaSortKeys.get(name) ?? Infinity,
        ({ attribute }) => sortNameForAttribute(attribute),
      ]);
    }
    return groups;
  }, [attributes, schema]);

  const missingByGroup = useMemo(() => {
    const missing: AnyBikkieAttribute[][] = ATTRIBUTE_GROUPS.map(() => []);
    for (const attribute of allUnusedAttributes) {
      for (let i = 0; i < ATTRIBUTE_GROUPS.length; ++i) {
        const group = ATTRIBUTE_GROUPS[i];
        if (!group.filter || group.filter(schema, attribute)) {
          missing[i].push(attribute);
          break;
        }
      }
    }
    return missing;
  }, [schema, allUnusedAttributes]);

  const [attributeToAdd, setAttributeToAdd] = useState<
    AnyBikkieAttribute | undefined
  >();
  useEffect(() => {
    if (allUnusedAttributes.length === 0) {
      setAttributeToAdd(undefined);
    } else if (allUnusedAttributes.some((a) => a.id === attributeToAdd?.id)) {
      return;
    }
    setAttributeToAdd(allUnusedAttributes[0]);
  }, [allUnusedAttributes, attributeToAdd]);

  const [duplicating, setDuplicating] = useState(false);
  const duplicateBiscuit = useCallback(async () => {
    if (duplicating || !selected) {
      return;
    }
    setDuplicating(true);
    try {
      await newBiscuit({
        proposedName: selected.name,
        extendedFrom: selected.extendedFrom,
        attributes: { ...merged },
      });
    } finally {
      setDuplicating(false);
    }
  }, [duplicating, selected, merged, newBiscuit]);

  return selected ? (
    <div className={styles["biscuit-editor"]} key={selected.id}>
      <div className={styles["biscuit-wrapper"]}>
        {schemaMissingAttributes.length > 0 && (
          <div className={styles["missing-attributes"]}>
            <span>
              Does not conform to{" "}
              <span className={styles["schema-path"]}>{schemaPath}</span>{" "}
              missing{" "}
              {schemaMissingAttributes
                .map((a) => a.name)
                .sort()
                .join(", ")}
              !
            </span>
            <button
              disabled={addingAllMissing}
              onClick={() => fireAndForget(addMissingAttributes())}
            >{`Add all missing`}</button>
          </div>
        )}
        <div className={styles["biscuit-header"]}>
          <div className={styles["biscuit-icon"]}>
            <Img src={selected.iconUrl} />
          </div>
          <div className={styles["biscuit-identity"]}>
            <div className={styles["biscuit-name"]}>
              <EditableText
                className={styles["name"]}
                value={selected.name}
                onChange={(value) => {
                  if (!VALID_BISCUIT_NAME.exec(value)) {
                    return "Invalid name";
                  }
                  editBiscuit({ id: selected.id, name: value });
                }}
                eraseOnEdit={(value) =>
                  /^newBiscuit[a-fA-F0-9]+$/.exec(value) !== null
                }
              />
              <label className={styles["id"]}>
                {selected.id}{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    fireAndForget(duplicateBiscuit());
                  }}
                >
                  Create Duplicate
                </a>
              </label>
            </div>
            <BiscuitLabels
              selected={selected}
              labels={labels}
              editAttributes={editAttributes}
            />
          </div>
        </div>
        <BiscuitModelPreview />
        <div
          className={
            narrowMode
              ? styles["biscuit-attributes-narrow"]
              : styles["biscuit-attributes"]
          }
        >
          {ATTRIBUTE_GROUPS.map((group, i) => (
            <Fragment key={i}>
              {groups[i].length > 0 && (
                <>
                  <h3>{group.name}</h3>
                  <div></div>
                  <BiscuitAttributesEditor
                    selected={selected}
                    attributes={groups[i]}
                    editAttributes={editAttributes}
                    resetToConstant={(attribute) =>
                      addAttribute(attribute, true)
                    }
                  />
                </>
              )}
            </Fragment>
          ))}
          {allUnusedAttributes.length > 0 ? (
            <>
              <label> New Attribute </label>
              <div className={styles["attribute-to-add"]}>
                <DialogTypeaheadInput
                  options={missingByGroup.flatMap((group) => group)}
                  getDisplayName={(e) => nameForAttribute(e)}
                  value={attributeToAdd}
                  onChange={(e) => {
                    setAttributeToAdd(e);
                  }}
                />
                <div className={styles["attribute-assignment"]}>
                  <div className={styles["attribute-to-add-button"]}>
                    <DialogButton
                      disabled={!attributeToAdd || addingAttribute}
                      onClick={() => {
                        if (attributeToAdd) {
                          fireAndForget(addAttribute(attributeToAdd));
                        }
                      }}
                    >
                      Add Attribute
                    </DialogButton>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  ) : (
    <></>
  );
};

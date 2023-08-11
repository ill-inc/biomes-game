import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { EntityIdEditor } from "@/client/components/admin/bikkie/attributes/EntityIdEditor";
import { QuestGiverEditor } from "@/client/components/admin/bikkie/attributes/QuestGiverEditor";
import type { FieldMatcher } from "@/client/components/admin/bikkie/attributes/triggers/leaves/event/ObjectMatcherList";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import styles from "@/client/styles/admin.module.css";
import type { ScanAllRequest } from "@/server/ask/api";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { bikkieTrue } from "@/shared/bikkie/schema/types";
import type { BiomesId } from "@/shared/ids";
import type { Matcher } from "@/shared/triggers/matcher_schema";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { compact } from "lodash";
import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";
import type { AnyZodObject } from "zod";

// Avoid circular
const ObjectMatcherList = dynamic(
  () =>
    import(
      "@/client/components/admin/bikkie/attributes/triggers/leaves/event/ObjectMatcherList"
    )
);

const EntityValuePrediacte: React.FunctionComponent<{
  schema: AnyZodObject;
  field: string;
  fieldMatcher: FieldMatcher;
  predicate: Matcher;
  onChange: (val?: [string, Matcher]) => unknown;
}> = ({ field, predicate, onChange }) => {
  ok(predicate.kind === "value");
  const value = predicate.value as BiomesId;

  const [kindIndex, setKindIndex] = useState(0);
  const allowedSelections: Array<[string, ScanAllRequest | undefined]> = [
    ["By Value", undefined],
    ["Named NPCs", "named_npcs"],
    ["Quest Givers", "quest_givers"],
  ];

  return (
    <li className={styles["predicate"]}>
      <div>{field} equals </div>
      <div>
        <SegmentedControl
          index={kindIndex}
          items={allowedSelections.map((e) => e[0])}
          onClick={(idx) => {
            if (idx !== kindIndex) {
              setKindIndex(idx);
            }
          }}
        />

        {kindIndex === 0 ? (
          <input
            type="number"
            value={value}
            onChange={(e) => {
              if (!e.target.value) {
                return;
              }
              const newVal = parseInt(e.target.value ?? "0");
              onChange([
                field,
                {
                  ...predicate,
                  value: newVal,
                },
              ]);
            }}
          />
        ) : (
          <EntityIdEditor
            value={value}
            onChange={(entityId) => {
              if (entityId) {
                onChange([
                  field,
                  {
                    ...predicate,
                    value: entityId,
                  },
                ]);
              }
            }}
            includeUnnamed={true}
            filter={allowedSelections[kindIndex][1]!}
          />
        )}
      </div>

      <button onClick={() => onChange()}>Remove</button>
    </li>
  );
};

const EnumValuePredicate: React.FunctionComponent<{
  schema: AnyZodObject;
  field: string;
  fieldMatcher: FieldMatcher;
  predicate: Matcher;
  values: string[];
  onChange: (val?: [string, Matcher]) => unknown;
}> = ({ field, predicate, onChange, values }) => {
  ok(predicate.kind === "value");
  const value = predicate.value as string;

  return (
    <li className={styles["predicate"]}>
      <div>{field} is </div>
      <select
        value={value}
        onChange={(e) => {
          onChange([
            field,
            {
              ...predicate,
              value: e.target.value,
            },
          ]);
        }}
      >
        {values.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <button onClick={() => onChange()}>Remove</button>
    </li>
  );
};

export const Predicate: React.FunctionComponent<{
  schema: AnyZodObject;
  field: string;
  fieldMatcher: FieldMatcher;
  predicate: Matcher;
  onChange: (val?: [string, Matcher]) => unknown;
}> = ({ field, predicate, schema, fieldMatcher, onChange }) => {
  const bikkiePredicates = useMemo(
    () => attribs.all.filter((e) => e.type() === bikkieTrue),
    []
  );
  const allItems = useMatchingBiscuits(
    fieldMatcher.biscuitSchemaPath ?? "/items"
  );

  switch (fieldMatcher.kind) {
    case "anyItemWith": {
      ok(predicate.kind === "anyItemWith");
      return (
        <li className={styles["predicate"]}>
          <div>{fieldMatcher.prettyName ?? `${field} ${predicate.kind}`}</div>
          <DialogTypeaheadInput
            options={bikkiePredicates}
            value={bikkiePredicates.find((e) => e.id === predicate.attributeId)}
            getDisplayName={(e) => e.niceName ?? e.name}
            onChange={(e) => {
              if (e) {
                onChange([
                  field,
                  {
                    ...predicate,
                    attributeId: e?.id,
                  },
                ]);
              }
            }}
          />
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "anyItemEqual": {
      ok(predicate.kind === "anyItemEqual");
      return (
        <li className={styles["predicate"]}>
          <div>{fieldMatcher.prettyName ?? `${field} ${predicate.kind}`}</div>

          <BiscuitDropDown
            biscuits={allItems}
            selected={predicate.bikkieId}
            useDisplayName={true}
            onSelect={(newItem) => {
              if (!newItem) {
                return;
              }
              onChange([
                field,
                {
                  ...predicate,
                  bikkieId: newItem,
                },
              ]);
            }}
          />

          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "questGiver": {
      ok(predicate.kind === "value");
      const value = predicate.value as BiomesId;
      return (
        <li className={styles["predicate"]}>
          <div>{field} is</div>
          <QuestGiverEditor
            value={value}
            onChange={(entityId) => {
              if (entityId) {
                onChange([
                  field,
                  {
                    ...predicate,
                    value: entityId,
                  },
                ]);
              }
            }}
          />
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "minigame": {
      ok(predicate.kind === "value");
      const value = predicate.value as BiomesId;
      return (
        <li className={styles["predicate"]}>
          <div>{field} is</div>
          <EntityIdEditor
            value={value}
            onChange={(entityId) => {
              if (entityId) {
                onChange([
                  field,
                  {
                    ...predicate,
                    value: entityId,
                  },
                ]);
              }
            }}
            filter={"ready_minigames"}
            includeUnnamed={true}
          />
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "enum": {
      ok(fieldMatcher.enumValues);
      return (
        <EnumValuePredicate
          {...{ schema, field, fieldMatcher, predicate, onChange }}
          values={fieldMatcher.enumValues}
        />
      );
    }

    case "entityIdValue": {
      return (
        <EntityValuePrediacte
          field={field}
          schema={schema}
          fieldMatcher={fieldMatcher}
          predicate={predicate}
          onChange={onChange}
        />
      );
    }

    case "boolValue": {
      ok(predicate.kind === "value");
      const value = predicate.value as boolean;

      return (
        <li className={styles["predicate"]}>
          <DialogCheckbox
            label={field}
            checked={value}
            onCheck={(e) => {
              onChange([
                field,
                {
                  ...predicate,
                  value: e,
                },
              ]);
            }}
          />
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "numberRange": {
      ok(predicate.kind === "numberRange");
      return (
        <li className={styles["predicate"]}>
          <div>{field} is between</div>
          <input
            type="number"
            value={predicate.min ?? ""}
            placeholder="Min"
            onChange={(e) => {
              const min =
                e.target.value === "" ? undefined : parseFloat(e.target.value);
              onChange([
                field,
                {
                  ...predicate,
                  min,
                },
              ]);
            }}
          />
          <input
            type="number"
            value={predicate.max ?? ""}
            placeholder="Max"
            onChange={(e) => {
              const max =
                e.target.value === "" ? undefined : parseFloat(e.target.value);
              onChange([
                field,
                {
                  ...predicate,
                  max,
                },
              ]);
            }}
          />
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "distinctArrayMatches": {
      ok(predicate.kind === "distinctArrayMatches");
      ok(fieldMatcher.arrayElementSchema);

      return (
        <li className={styles["predicate"]}>
          <div>{field} matches exactly</div>
          <div className="flex-grow">
            <ul>
              {(predicate.fields ?? []).map((f, i) => {
                ok(f.kind === "object");
                return (
                  <li key={i}>
                    <label>Match #{i + 1}</label>
                    <div className="ml-5">
                      <ObjectMatcherList
                        schema={fieldMatcher.arrayElementSchema!}
                        key={i}
                        matcher={f}
                        onChange={(val) => {
                          ok(predicate.kind === "distinctArrayMatches");
                          onChange([
                            field,
                            {
                              ...predicate,
                              fields: compact([
                                ...predicate.fields.slice(0, i),
                                val,
                                ...predicate.fields.slice(i + 1),
                              ]),
                            },
                          ]);
                        }}
                      />
                    </div>
                    <button
                      onClick={() =>
                        onChange([
                          field,
                          {
                            ...predicate,
                            fields: compact([
                              ...predicate.fields.slice(0, i),
                              ...predicate.fields.slice(i + 1),
                            ]),
                          },
                        ])
                      }
                    >
                      Remove Match
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() =>
                onChange([
                  field,
                  {
                    ...predicate,
                    fields: [
                      ...predicate.fields,
                      {
                        kind: "object",
                        fields: [],
                      },
                    ],
                  },
                ])
              }
            >
              Add Match
            </button>
          </div>
          <button onClick={() => onChange()}>Remove</button>
        </li>
      );
    }

    case "numberRange":
      break;

    default:
      assertNever(fieldMatcher.kind);
  }

  return <></>;
};

import { INVALID_BIOMES_ID } from "@/shared/ids";
import type {
  DiscreteGameStatePredicate,
  RangeGameStatePredicate,
} from "@/shared/loot_tables/indexing";
import type { GameStatePredicate } from "@/shared/loot_tables/predicates";
import { gameStatePredicateDefault } from "@/shared/loot_tables/predicates";
import { zGameStatePredicate } from "@/shared/loot_tables/predicates";
import { compact, toNumber } from "lodash";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import { BiscuitIdEditor } from "@/client/components/admin/bikkie/attributes/BiscuitIdEditor";
import type { ZodDiscriminatedUnion, ZodObject } from "zod";
import { ZodOptional } from "zod";
import { useMemo } from "react";
import { flatMap } from "lodash";
import type { AABB } from "@/shared/math/types";

// This is separate so we can show default infinity values values
const GameStatePositionPredicateEditor: React.FunctionComponent<{
  value: Extract<GameStatePredicate, { kind: "position" }>;
  onChange: (
    predicate: Extract<GameStatePredicate, { kind: "position" }>
  ) => void;
}> = ({ value, onChange }) => {
  return (
    <div className={"flex flex-col"}>
      {[0, 1].map((i) => (
        <div key={i} className={"flex"}>
          {[0, 1, 2].map((j) => {
            return (
              <>
                <label className={"m-auto text-tertiary-gray"}>
                  {j === 0 ? "X" : j === 1 ? "Y" : "Z"}
                </label>
                <input
                  key={j}
                  type={"number"}
                  value={isFinite(value.bounds[i][j]) ? value.bounds[i][j] : ""}
                  placeholder={i === 0 ? "-∞" : "∞"}
                  onChange={(e) => {
                    const newBounds: AABB = [
                      [...value.bounds[0]],
                      [...value.bounds[1]],
                    ];
                    if (e.target.value === "") {
                      const defVal = i === 0 ? -Infinity : Infinity;
                      newBounds[i][j] = defVal;
                    } else {
                      newBounds[i][j] = toNumber(e.target.value);
                    }
                    onChange({
                      ...value,
                      bounds: newBounds,
                    });
                  }}
                />
              </>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const GameStateRangePredicateEditor: React.FunctionComponent<{
  value: RangeGameStatePredicate;
  onChange: (predicate: RangeGameStatePredicate) => void;
}> = ({ value, onChange }) => {
  return (
    <div className={"flex"}>
      <input
        type={"number"}
        value={value?.min}
        placeholder={"-∞"}
        onChange={(e) => {
          if (e.target.value === "") {
            onChange({
              ...value,
              min: undefined,
            });
          } else {
            onChange({
              ...value,
              min: toNumber(e.target.value),
            });
          }
        }}
      />
      ➜
      <input
        type={"number"}
        value={value?.max}
        placeholder={"∞"}
        onChange={(e) => {
          if (e.target.value === "") {
            onChange({
              ...value,
              max: undefined,
            });
          } else {
            onChange({
              ...value,
              max: toNumber(e.target.value),
            });
          }
        }}
      />
    </div>
  );
};

export const GameStatePredicateEditor: React.FunctionComponent<{
  value: GameStatePredicate;
  onChange: (predicate: GameStatePredicate) => void;
}> = ({ value, onChange }) => {
  // values with specific editor properties
  switch (value.kind) {
    case "bait":
      return (
        <BiscuitIdEditor
          value={value.value ?? INVALID_BIOMES_ID}
          schema={"/items"}
          onChange={(id) => {
            onChange({
              ...value,
              kind: value.kind,
              value: id,
            });
          }}
        />
      );
    case "block":
      return (
        <BiscuitIdEditor
          value={value.value ?? INVALID_BIOMES_ID}
          schema={"/blocks"}
          onChange={(id) => {
            onChange({
              ...value,
              kind: value.kind,
              value: id,
            });
          }}
        />
      );
    case "position":
      return (
        <GameStatePositionPredicateEditor value={value} onChange={onChange} />
      );
  }

  // single/discrete values
  if ("value" in value) {
    // grab the zod schema for the value
    // a little gross
    const zPredicates = compact(
      flatMap(zGameStatePredicate.options, (option) =>
        option.optionsMap.get(value.kind)
      )
    );
    let discreteValueType = zPredicates[0]?.shape.value;
    if (discreteValueType instanceof ZodOptional) {
      discreteValueType = discreteValueType.unwrap();
    }
    if (!discreteValueType) {
      return <></>;
    }
    return (
      <ZfsAny
        schema={discreteValueType}
        value={value ? value.value : undefined}
        onChangeRequest={(newVal) => {
          onChange({
            ...value,
            kind: value.kind as Extract<
              DiscreteGameStatePredicate,
              { value: typeof discreteValueType }
            >["kind"],
            value: newVal,
          });
        }}
      />
    );
  }

  // number range values
  const defaultPredicate = gameStatePredicateDefault(value.kind);
  if (defaultPredicate && "min" in defaultPredicate) {
    return (
      <GameStateRangePredicateEditor
        value={value as RangeGameStatePredicate}
        onChange={onChange}
      />
    );
  }

  // Nothing to edit / unknown predicate type
  return <></>;
};

export const GameStatePredicatesEditor: React.FunctionComponent<{
  value: GameStatePredicate[];
  predicateSchema?: ZodDiscriminatedUnion<"kind", ZodObject<any>[]>;
  onChange: (predicates: GameStatePredicate[]) => void;
}> = ({ value, predicateSchema, onChange }) => {
  const allPredicates = predicateSchema
    ? ([...predicateSchema.optionsMap.keys()] as GameStatePredicate["kind"][])
    : (flatMap(zGameStatePredicate.options, (options) => [
        ...options.optionsMap.keys(),
      ]) as GameStatePredicate["kind"][]);
  const addablePredicates = useMemo(() => {
    const usedPredicates = new Set<GameStatePredicate["kind"]>();
    for (const predicate of value) {
      usedPredicates.add(predicate.kind);
    }
    return allPredicates.filter((kind) => !usedPredicates.has(kind)).sort();
  }, [value]);
  return (
    <div className={" flex flex-col"}>
      {value.map((predicate, i) => (
        <div key={i} className={"flex items-start gap-2"}>
          <select
            value={predicate.kind}
            className={"basis-1/2"}
            onChange={(e) => {
              e.preventDefault();
              if (e.target.value === "") {
                onChange([...value.slice(0, i), ...value.slice(i + 1)]);
                return;
              }
              const kind = e.target.value as GameStatePredicate["kind"];
              const defaultPredicate = gameStatePredicateDefault(kind);
              if (defaultPredicate) {
                onChange([
                  ...value.slice(0, i),
                  defaultPredicate,
                  ...value.slice(i + 1),
                ]);
              }
            }}
          >
            <option value="">Remove</option>
            <option value={predicate.kind}>{predicate.kind}</option>
            {addablePredicates.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <div className={"flex basis-1/2 justify-between"}>
            <GameStatePredicateEditor
              value={predicate}
              onChange={(newPredicate) => {
                onChange([
                  ...value.slice(0, i),
                  newPredicate,
                  ...value.slice(i + 1),
                ]);
              }}
            />
          </div>
        </div>
      ))}
      <select
        value={""}
        onChange={(e) => {
          e.preventDefault();
          const kind = e.target.value as GameStatePredicate["kind"];
          const defaultPredicate = gameStatePredicateDefault(kind);
          if (defaultPredicate) {
            onChange([...value, defaultPredicate]);
          }
        }}
      >
        <option value={""} disabled>
          Add Condition
        </option>
        {addablePredicates.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
    </div>
  );
};

import { CountInput } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/CountInput";
import styles from "@/client/styles/admin.module.css";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { zFirehoseEvent } from "@/shared/firehose/events";

import { ObjectMatcherList } from "@/client/components/admin/bikkie/attributes/triggers/leaves/event/ObjectMatcherList";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import type { ObjectMatcher } from "@/shared/triggers/matcher_schema";
import type { EventStoredTriggerDefinition } from "@/shared/triggers/schema";
import { ok } from "assert";
import { startCase } from "lodash";
import React, { useMemo } from "react";
import type { AnyZodObject } from "zod";

export const EditEventTrigger: React.FunctionComponent<{
  def: Readonly<EventStoredTriggerDefinition>;
  onChange: (def: EventStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  ok(def.predicate === undefined || def.predicate.kind === "object");
  const eventKinds = useMemo(
    () =>
      [...(zFirehoseEvent._def.optionsMap.keys() as Iterable<string>)].sort(),
    []
  ) as FirehoseEvent["kind"][];
  const schema = zFirehoseEvent._def.optionsMap.get(def.eventKind);
  return (
    <>
      <li>
        <label>Event Kind</label>
        <DialogTypeaheadInput
          options={eventKinds}
          getDisplayName={(e) => startCase(e)}
          onChange={(e) => {
            onChange({
              ...def,
              eventKind: e as FirehoseEvent["kind"],
              predicate: undefined,
            });
          }}
          value={def.eventKind}
        />
      </li>
      <li>
        <label>Count</label>
        <CountInput def={def} onChange={onChange} />
      </li>
      <div className={styles["break"]} />
      <li>
        <ObjectMatcherList
          ignoreFields={["kind", "entityId"]}
          schema={schema as AnyZodObject}
          matcher={
            (def.predicate as ObjectMatcher) ?? {
              kind: "object",
              fields: [],
            }
          }
          onChange={(matcher) => {
            onChange({
              ...def,
              predicate: matcher,
            });
          }}
        />
      </li>
    </>
  );
};

import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import type { NewTriggerRequest } from "@/pages/api/admin/triggers/new";
import { triggerPartials } from "@/shared/triggers/default";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zStoredTriggerDefinition } from "@/shared/triggers/schema";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { zrpcWebDeserialize } from "@/shared/zrpc/serde";
import { useMemo, useState } from "react";

export const AddTriggerControl: React.FunctionComponent<{
  onAdd: (def: StoredTriggerDefinition) => void;
  kinds?: StoredTriggerDefinition["kind"][];
}> = ({ onAdd, kinds }) => {
  const allowedTriggers = useMemo(() => {
    if (kinds === undefined) {
      return triggerPartials();
    }
    const kindSet = new Set(kinds);
    return triggerPartials().filter(([_, def]) => kindSet.has(def.kind));
  }, [kinds]);
  const [kindToAdd, setKindToAdd] = useState<StoredTriggerDefinition["kind"]>();
  const [addingTrigger, setAddingTrigger] = useState(false);
  const kindIndex = allowedTriggers.findIndex(
    ([_, def]) => def.kind === kindToAdd
  );
  return (
    <>
      {allowedTriggers.length > 4 ? (
        <DialogTypeaheadInput
          value={allowedTriggers.find((e) => e[1].kind === kindToAdd)}
          options={allowedTriggers}
          getDisplayName={(e) => e[0]}
          onChange={(e) => {
            setKindToAdd(e?.[1].kind);
          }}
        />
      ) : (
        <SegmentedControl
          index={kindIndex}
          items={allowedTriggers.map(([name]) => name)}
          onClick={(idx) => {
            if (idx !== kindIndex) {
              setKindToAdd(allowedTriggers[idx][1].kind);
            }
          }}
        />
      )}
      {kindToAdd !== undefined && (
        <DialogButton
          disabled={addingTrigger}
          onClick={() => {
            if (addingTrigger) {
              return;
            }
            setAddingTrigger(true);
            void (async () => {
              try {
                onAdd(
                  zrpcWebDeserialize(
                    await jsonPost<string, NewTriggerRequest>(
                      "/api/admin/triggers/new",
                      {
                        kinds: [kindToAdd],
                      }
                    ),
                    zStoredTriggerDefinition
                  )
                );
              } finally {
                setAddingTrigger(false);
              }
            })();
          }}
        >
          Add
        </DialogButton>
      )}
    </>
  );
};

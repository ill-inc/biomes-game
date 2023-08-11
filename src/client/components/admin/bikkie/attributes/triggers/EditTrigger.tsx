import { AdminInlinePreviewImageUpload } from "@/client/components/admin/AdminInlinePreviewImageUpload";
import {
  defaultNavigationAidOfKind,
  EditNavigationAid,
} from "@/client/components/admin/bikkie/attributes/triggers/EditTriggerNavigationAid";
import { EditApproachPositionTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditApproachPositionTrigger";
import { EditBlueprintBuiltTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditBlueprintBuiltTrigger";
import { EditCameraPhotoTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditCameraPhotoTrigger";
import { EditChallengeCompleteTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditChallengeCompleteTrigger";
import { EditChallengeUnlockedTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditChallengeUnlockedTrigger";
import { EditCollectTypeTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditCollectTypeTrigger";
import { EditCraftTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditCraftTrigger";
import { EditCraftTypeTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditCraftTypeTrigger";
import { EditEventTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditEventTrigger";
import { EditItemCountTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditItemCountTrigger";
import { EditMapBeamTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditMapBeamTrigger";
import { EditPlaceTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditPlaceTrigger";
import { EditTalkToTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditTalkToTrigger";
import { EditWearTypeTrigger } from "@/client/components/admin/bikkie/attributes/triggers/leaves/EditWearTypeTrigger";
import { AddTriggerControl } from "@/client/components/admin/bikkie/attributes/triggers/subcomponents/AddTriggerControl";
import { ZfsEnum } from "@/client/components/admin/zod_form_synthesis/ZfsEnum";
import { getTriggerIconUrl } from "@/client/components/inventory/icons";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { TextArea } from "@/client/components/system/TextArea";
import { computeTriggerProgress } from "@/client/game/resources/challenges";
import styles from "@/client/styles/admin.challenges.module.css";
import { anItem } from "@/shared/game/item";
import { parseBiomesId } from "@/shared/ids";
import { triggerPartials } from "@/shared/triggers/default";
import type {
  AllStoredTriggerDefinition,
  AnyStoredTriggerDefinition,
  SeqStoredTriggerDefinition,
  StoredTriggerDefinition,
  VariantRollType,
  VariantStoredTriggerDefinition,
} from "@/shared/triggers/schema";
import { zVariantRollType } from "@/shared/triggers/schema";
import { withSwappedLocations } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { useMemo, useState } from "react";

export const EditTrigger: React.FunctionComponent<{
  def: Readonly<StoredTriggerDefinition>;
  onChange: (def: StoredTriggerDefinition) => void;
  kinds?: StoredTriggerDefinition["kind"][];
  hideIcon?: boolean;
  hideTitle?: boolean;
  hideDescription?: boolean;
  hideNavigation?: boolean;
}> = ({
  def,
  onChange,
  hideIcon,
  hideTitle,
  hideDescription,
  hideNavigation,
}) => {
  const [iconItemId, setIconItemId] = useState<string>(
    def.icon?.kind === "item" ? String(def.icon.item.id) : ""
  );
  return (
    <>
      <div className={[styles["section"]].join(" ")}>
        <ul className={styles["flag-param-editor"]}>
          <EditTriggerLeaf def={def} onChange={onChange} />
        </ul>
      </div>
      {!hideNavigation && (
        <div className={[styles["section"]].join(" ")}>
          <DialogCheckbox
            label={`Attach Navigation Aid`}
            checked={!!def.navigationAid}
            onCheck={(checked) => {
              onChange({
                ...def,
                navigationAid: checked
                  ? defaultNavigationAidOfKind("position")
                  : undefined,
              });
            }}
          />
          {def.navigationAid && (
            <EditNavigationAid
              navigationAid={def.navigationAid}
              onChange={(navigationAid) => {
                onChange({ ...def, navigationAid });
              }}
            />
          )}
        </div>
      )}
      {!hideTitle && (
        <div>
          <label>Step Title</label>
          <input
            type="text"
            value={def.name || ""}
            onChange={(e) => {
              onChange({
                ...def,
                name: e.target.value,
              });
            }}
          />
        </div>
      )}
      {!hideIcon && (
        <div>
          <label>Step Icon</label>
          <div className={styles["step-icon-selector"]}>
            <AdminInlinePreviewImageUpload
              size="thumbnail"
              bucket="biomes-static"
              basePath="challenge-icons"
              showingPreview={def.icon && getTriggerIconUrl(def.icon)}
              onClear={() => {
                setIconItemId("");
                onChange({ ...def, icon: undefined });
              }}
              onUploadComplete={(locations) => {
                setIconItemId("");
                onChange({
                  ...def,
                  icon: {
                    kind: "custom",
                    bundle: locations,
                  },
                });
              }}
            />
            <input
              type="number"
              placeholder="Icon Item Bikkie ID"
              value={iconItemId && String(iconItemId)}
              onChange={(evt) => {
                evt.preventDefault();
                setIconItemId(evt.target.value);
                if (evt.target.value) {
                  const id = parseBiomesId(evt.target.value);
                  onChange({
                    ...def,
                    icon: {
                      kind: "item",
                      item: anItem(id),
                    },
                  });
                } else {
                  onChange({ ...def, icon: undefined });
                }
              }}
            ></input>
          </div>
        </div>
      )}
      {!hideDescription && (
        <div>
          <label>Step Description</label>
          <TextArea
            autoSize={true}
            value={def.description || ""}
            onChange={(e) => {
              onChange({
                ...def,
                description: e.target.value,
              });
            }}
          />
        </div>
      )}
    </>
  );
};

export type AggregateStoredTriggerDefinition =
  | AllStoredTriggerDefinition
  | AnyStoredTriggerDefinition
  | SeqStoredTriggerDefinition
  | VariantStoredTriggerDefinition;

export const AGGREGATE_FLAG_NAMES: string[] = [
  "Ordered",
  "Unordered",
  "One of",
  "Variant",
];
export const AGGREGATE_FLAG_KINDS: AggregateStoredTriggerDefinition["kind"][] =
  ["seq", "all", "any", "variant"];

export function isAggregateTrigger(
  triggerDef: StoredTriggerDefinition
): triggerDef is AggregateStoredTriggerDefinition {
  return (AGGREGATE_FLAG_KINDS as StoredTriggerDefinition["kind"][]).includes(
    triggerDef.kind
  );
}
export const EditAggregateTrigger: React.FunctionComponent<{
  def: Readonly<AggregateStoredTriggerDefinition>;
  onChange: (def: AggregateStoredTriggerDefinition) => void;
  kinds?: StoredTriggerDefinition["kind"][];
  hideIcon?: boolean;
  hideTitle?: boolean;
  hideDescription?: boolean;
  hideNavigation?: boolean;
}> = ({
  def,
  onChange,
  kinds,
  hideIcon,
  hideTitle,
  hideDescription,
  hideNavigation,
}) => {
  const controlIndex = AGGREGATE_FLAG_KINDS.indexOf(def.kind);
  const kindToName = useMemo(() => {
    return Object.fromEntries(
      triggerPartials().map(([name, def]) => [def.kind, name])
    );
  }, []);

  const childHeader = (childTrigger: StoredTriggerDefinition, idx: number) => {
    const title = (() => {
      switch (def.kind) {
        case "all":
          return "Step [All]";
        case "any":
          return "Step [Any]";
        case "seq":
          return `Step ${idx + 1}`;
        case "variant":
          return `Variant ${idx + 1}`;
      }
    })();
    return (
      <>
        <div className={styles["step-header"]}>
          <>
            {title} —{" "}
            {
              computeTriggerProgress(
                undefined,
                undefined,
                undefined,
                childTrigger,
                () => undefined
              ).progressString
            }{" "}
            ({childTrigger.id}/{childTrigger.kind})
          </>
        </div>
        <div className={styles["step-header-simple"]}>
          {kindToName[childTrigger.kind]}
        </div>
      </>
    );
  };

  return (
    <div className={styles["flag-recursive"]}>
      <div className={styles["flag-header"]}>
        <label>Ordering</label>
        <div className={styles["segmented-control"]}>
          <SegmentedControl
            index={controlIndex}
            items={AGGREGATE_FLAG_NAMES}
            onClick={(idx) => {
              if (idx !== controlIndex) {
                const kind = AGGREGATE_FLAG_KINDS[idx];
                const newDef =
                  kind === "variant"
                    ? {
                        ...def,
                        kind,
                        rollType: "daily" as const,
                      }
                    : {
                        ...def,
                        kind,
                      };
                onChange(newDef);
              }
            }}
          />
        </div>
      </div>
      {def.kind === "variant" && (
        <>
          <label>Roll Type</label>
          <ZfsEnum
            schema={zVariantRollType}
            value={def.rollType}
            onChangeRequest={(v) => {
              const rollType = v as VariantRollType;
              onChange({
                ...def,
                rollType,
              });
            }}
          />
        </>
      )}
      <ul className={styles["flag-recursive-entries"]}>
        {def.triggers.map((trigger, i) => (
          <li className={styles["flag-entry"]} key={trigger.id}>
            {childHeader(trigger, i)}
            <EditTrigger
              def={trigger}
              onChange={(newTrigger) => {
                onChange({
                  ...def,
                  triggers: def.triggers.map((t) =>
                    t.id === trigger.id ? newTrigger : t
                  ),
                });
              }}
              kinds={kinds}
              hideIcon={hideIcon}
              hideTitle={hideTitle}
              hideDescription={hideDescription}
              hideNavigation={hideNavigation}
            />
            <div className={styles["flag-buttons"]}>
              <DialogButton
                disabled={i === 0}
                onClick={() => {
                  onChange({
                    ...def,
                    triggers: withSwappedLocations(def.triggers, i, i - 1),
                  });
                }}
              >
                ↑
              </DialogButton>

              <DialogButton
                disabled={i === def.triggers.length - 1}
                onClick={() => {
                  const newTriggers = [...def.triggers];
                  newTriggers.splice(i + 1, 0, newTriggers.splice(i, 1)[0]);

                  onChange({
                    ...def,
                    triggers: withSwappedLocations(def.triggers, i, i + 1),
                  });
                }}
              >
                ↓
              </DialogButton>

              <DialogButton
                onClick={() => {
                  onChange({
                    ...def,
                    triggers: def.triggers.filter((t) => t.id !== trigger.id),
                  });
                }}
              >
                Delete
              </DialogButton>
            </div>
          </li>
        ))}
        <li className={styles["flag-entry"]}>
          New Step
          <AddTriggerControl
            onAdd={(newTrigger) => {
              onChange({
                ...def,
                triggers: [...def.triggers, newTrigger],
              });
            }}
            kinds={kinds}
          />
        </li>
      </ul>
    </div>
  );
};

export const EditTriggerLeaf: React.FunctionComponent<{
  def: StoredTriggerDefinition;
  onChange: (def: StoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  switch (def.kind) {
    case "all":
    case "any":
    case "seq":
    case "variant":
      return <EditAggregateTrigger def={def} onChange={onChange} hideIcon />;
    case "blueprintBuilt":
      return <EditBlueprintBuiltTrigger def={def} onChange={onChange} />;
    case "cameraPhoto":
      return <EditCameraPhotoTrigger def={def} onChange={onChange} />;
    case "completeQuestStepAtMyRobot":
    case "challengeClaimRewards":
      return <EditTalkToTrigger def={def} onChange={onChange} />;
    case "challengeComplete":
      return <EditChallengeCompleteTrigger def={def} onChange={onChange} />;
    case "challengeUnlocked":
      return <EditChallengeUnlockedTrigger def={def} onChange={onChange} />;
    case "craft":
      return <EditCraftTrigger def={def} onChange={onChange} />;
    case "craftType":
      return <EditCraftTypeTrigger def={def} onChange={onChange} />;
    case "event":
      return <EditEventTrigger def={def} onChange={onChange} />;

    case "collect":
    case "everCollect":
    case "everCraft":
    case "inventoryHas":
      return <EditItemCountTrigger def={def} onChange={onChange} />;

    case "collectType":
    case "everCollectType":
    case "everCraftType":
    case "inventoryHasType":
      return <EditCollectTypeTrigger def={def} onChange={onChange} />;
    case "place":
      return <EditPlaceTrigger def={def} onChange={onChange} />;
    case "wear":
      return <EditItemCountTrigger def={def} onChange={onChange} />;
    case "wearType":
      return <EditWearTypeTrigger def={def} onChange={onChange} />;
    case "mapBeam":
      return <EditMapBeamTrigger def={def} onChange={onChange} />;
    case "approachPosition":
      return <EditApproachPositionTrigger def={def} onChange={onChange} />;
    default:
      assertNever(def);
      return <></>;
  }
};

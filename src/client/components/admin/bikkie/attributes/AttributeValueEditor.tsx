import { BinaryAttributeEditor } from "@/client/components/admin/bikkie/attributes/BinaryAttributeEditor";
import { BiscuitIdEditor } from "@/client/components/admin/bikkie/attributes/BiscuitIdEditor";
import { BiscuitSetEditor } from "@/client/components/admin/bikkie/attributes/BiscuitSetEditor";
import {
  BuffsAndProbabilitiesAttributeEditor,
  BuffsAttributeEditor,
} from "@/client/components/admin/bikkie/attributes/BuffsAttributeEditor";
import { DropTableEditor } from "@/client/components/admin/bikkie/attributes/DropTableEditor";
import { FishConditionsEditor } from "@/client/components/admin/bikkie/attributes/FishConditionsEditor";
import { FishLengthDistributionEditor } from "@/client/components/admin/bikkie/attributes/FishLengthDistributionEditor";
import { FishMinigameAdjustmentsEditor } from "@/client/components/admin/bikkie/attributes/FishMinigameAdjustmentsEditor";
import { ItemBagEditor } from "@/client/components/admin/bikkie/attributes/ItemBagEditor";
import { MetaquestPointsEditor } from "@/client/components/admin/bikkie/attributes/MetaquestPointsEditor";
import { NumberRangeEditor } from "@/client/components/admin/bikkie/attributes/NumberRangeEditor";
import { PaletteColorEditor } from "@/client/components/admin/bikkie/attributes/PaletteColorEditor";
import { PredicateSetEditor } from "@/client/components/admin/bikkie/attributes/PredicateSetEditor";
import { QuestGiverEditor } from "@/client/components/admin/bikkie/attributes/QuestGiverEditor";
import { TriggerIconEditor } from "@/client/components/admin/bikkie/attributes/TriggerIconEditor";
import { EditFarming } from "@/client/components/admin/bikkie/attributes/farming/EditFarming";
import { EditFertilizerEffect } from "@/client/components/admin/bikkie/attributes/farming/EditFertilizerEffect";
import { EditTrigger } from "@/client/components/admin/bikkie/attributes/triggers/EditTrigger";
import { nameForAttribute } from "@/client/components/admin/bikkie/util";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import { ZfsEnum } from "@/client/components/admin/zod_form_synthesis/ZfsEnum";
import {
  makeLensMap,
  makeLensMapEntry,
} from "@/client/components/admin/zod_form_synthesis/shared";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { AssetPath } from "@/galois/interface/asset_paths";
import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import type { AnyBikkieAttribute } from "@/shared/bikkie/attributes";
import {
  isAnyBinaryAttribute,
  zAnyBinaryAttribute,
} from "@/shared/bikkie/schema/binary";
import {
  bikkieBagSpec,
  bikkieBlockList,
  bikkieBuffs,
  bikkieBuffsAndProbabilities,
  bikkieCollectionCategory,
  bikkieCraftingStationIdSet,
  bikkieCraftingStationType,
  bikkieDeedId,
  bikkieDropTable,
  bikkieFarming,
  bikkieFertilizerEffect,
  bikkieFishConditions,
  bikkieFishLengthDistribution,
  bikkieFishMinigameAdjustments,
  bikkieItemTypeSet,
  bikkieMetaquestPoints,
  bikkieNpcBag,
  bikkiePaletteColor,
  bikkiePredicateSet,
  bikkieQuestGiverId,
  bikkieTriggerDefinition,
  bikkieTriggerIcon,
  bikkieTrue,
  isNumberRangeType,
  zCraftingStationType,
} from "@/shared/bikkie/schema/types";
import { bagToBagSpec } from "@/shared/game/items";
import { bagSpecToItemBag } from "@/shared/game/items_serde";
import { zSoundEffectAsset } from "@/shared/npc/effect_profiles";
import { z } from "zod";

const SoundAsset: React.FunctionComponent<{
  schema: typeof zSoundEffectAsset;
  value: AssetPath;
  onChangeRequest: (newValue: AssetPath) => void;
}> = ({ schema, value, onChangeRequest }) => {
  const playButton = (() => {
    const assetUrl = resolveAssetUrlUntyped(value);
    if (assetUrl) {
      const audioTag = document.createElement("audio");
      const audioSource = document.createElement("source");
      audioTag.appendChild(audioSource);
      audioSource.src = assetUrl;
      return (
        <DialogButton
          onClick={() => {
            audioTag.pause();
            audioTag.currentTime = 0;
            void audioTag.play();
          }}
        >
          Play
        </DialogButton>
      );
    } else {
      return (
        <Tooltipped tooltip={`Could not find asset for "${value}"`}>
          <DialogButton disabled={true}>Play</DialogButton>
        </Tooltipped>
      );
    }
  })();

  return (
    <div className={styles["sound-effect"]}>
      <ZfsEnum
        schema={schema}
        value={value}
        onChangeRequest={(v: string) => onChangeRequest(v as AssetPath)}
      ></ZfsEnum>
      {playButton}
    </div>
  );
};

function soundAssetLens(
  schema: typeof zSoundEffectAsset,
  value: string,
  onChangeRequest: (newValue: string) => void
) {
  return (
    <SoundAsset
      schema={schema}
      value={value as AssetPath}
      onChangeRequest={onChangeRequest}
    ></SoundAsset>
  );
}

export const AttributeValueEditor: React.FunctionComponent<{
  attribute: AnyBikkieAttribute;
  value: any;
  onChange: (value: any) => void;
}> = ({ attribute, value, onChange }) => {
  const type = attribute.type();
  switch (type) {
    case bikkieTrue:
      return (
        <div className={styles["unassigned-attribute"]}>
          <div>{nameForAttribute(attribute)} is true.</div>
        </div>
      );
    case bikkieBuffsAndProbabilities:
      return (
        <BuffsAndProbabilitiesAttributeEditor
          value={value}
          onChange={onChange}
        />
      );
    case bikkieBuffs:
      return <BuffsAttributeEditor value={value} onChange={onChange} />;
    case bikkieBagSpec:
      return (
        <ItemBagEditor
          bag={bagSpecToItemBag(value)}
          onChange={(bag) => onChange(bagToBagSpec(bag))}
        />
      );
    case bikkieNpcBag:
      return (
        <ItemBagEditor
          schema={"/npcs/types"}
          bag={bagSpecToItemBag(value)}
          onChange={(bag) => onChange(bagToBagSpec(bag))}
        />
      );
    case bikkieQuestGiverId:
      return <QuestGiverEditor value={value} onChange={onChange} />;
    case bikkieCraftingStationIdSet:
      return (
        <BiscuitSetEditor
          value={value}
          placeholder={"No crafting station required"}
          schema={"/items/craftingStation"}
          onChange={onChange}
        />
      );
    case bikkieItemTypeSet:
      return (
        <BiscuitSetEditor
          value={value}
          placeholder={"None"}
          schema={"/items"}
          onChange={onChange}
        />
      );
    case bikkiePredicateSet:
      return (
        <PredicateSetEditor
          value={value}
          onChange={onChange}
          placeholder={"None"}
        />
      );

    case bikkieBlockList:
      return (
        <BiscuitSetEditor
          value={value}
          placeholder={"No blocks"}
          schema={"/blocks"}
          onChange={onChange}
        />
      );
    case bikkieTriggerDefinition:
      return (
        <EditTrigger
          def={value}
          onChange={onChange}
          hideIcon={true}
          hideTitle={true}
          hideDescription={true}
          hideNavigation={true}
        />
      );
    case bikkieFarming:
      return <EditFarming def={value} onChange={onChange} />;
    case bikkieDeedId:
      return <>Legacy deed</>;
    case bikkieDropTable:
      return (
        <DropTableEditor value={value} schema={"/items"} onChange={onChange} />
      );
    case bikkieTriggerIcon:
      return <TriggerIconEditor value={value} onChange={onChange} />;
    case bikkieFertilizerEffect:
      return <EditFertilizerEffect value={value} onChange={onChange} />;
    case bikkieCraftingStationType:
      return (
        <ZfsEnum
          schema={zCraftingStationType}
          value={value}
          onChangeRequest={onChange}
        />
      );
    case bikkieCollectionCategory:
      return (
        <BiscuitIdEditor
          schema={"/collectionCategories"}
          value={value}
          onChange={onChange}
        />
      );
    case bikkieFishLengthDistribution:
      return (
        <FishLengthDistributionEditor
          distribution={value}
          onChange={onChange}
        />
      );
    case bikkieFishMinigameAdjustments:
      return (
        <FishMinigameAdjustmentsEditor value={value} onChange={onChange} />
      );
    case bikkieFishConditions:
      return <FishConditionsEditor value={value} onChange={onChange} />;
    case bikkieMetaquestPoints:
      return <MetaquestPointsEditor value={value} onChange={onChange} />;
    case bikkiePaletteColor:
      return <PaletteColorEditor value={value} onChange={onChange} />;
    default:
      return (
        <ZfsAny
          schemaLenses={makeLensMap(
            makeLensMapEntry(zSoundEffectAsset, soundAssetLens),
            makeLensMapEntry(
              zAnyBinaryAttribute,
              (schema, value, onChangeRequest) => (
                <BinaryAttributeEditor
                  attributeType={schema}
                  value={value}
                  onChange={onChangeRequest}
                />
              ),
              (schema) => isAnyBinaryAttribute(schema)
            ),
            makeLensMapEntry(
              z.number(),
              (schema, value, onChangeRequest) => (
                <NumberRangeEditor
                  schema={schema}
                  value={value}
                  onChangeRequest={onChangeRequest}
                />
              ),
              (schema) => isNumberRangeType(schema)
            )
          )}
          schema={attribute.type()}
          value={value}
          onChangeRequest={onChange}
        />
      );
  }
};

import { AdminPage } from "@/client/components/admin/AdminPage";
import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import {
  useBiscuit,
  useMatchingBiscuits,
} from "@/client/components/admin/bikkie/search";
import type { ResetMetaquestRequest } from "@/pages/api/admin/reset_metaquest";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { useCallback, useState } from "react";

export const Metaquests: React.FunctionComponent<{}> = () => {
  const metaquests = useMatchingBiscuits("/metaquests");
  const [selectedId, setSelectedId] = useState<BiomesId>(INVALID_BIOMES_ID);
  const resetMetaquest = useCallback(async () => {
    if (!selectedId) return;
    await jsonPost<void, ResetMetaquestRequest>("/api/admin/reset_metaquest", {
      id: selectedId,
    });
  }, [selectedId]);
  const metaquest = useBiscuit(selectedId);
  return (
    <AdminPage>
      <BiscuitDropDown
        biscuits={metaquests}
        selected={metaquest?.id ?? INVALID_BIOMES_ID}
        nullItem={"Select a metaquest"}
        onSelect={(id) => {
          setSelectedId(id ?? INVALID_BIOMES_ID);
        }}
      />
      {metaquest && (
        <div>
          <h1>{metaquest.displayName}</h1>
          <button onClick={() => void resetMetaquest()}>Reset</button>
        </div>
      )}
    </AdminPage>
  );
};

export default Metaquests;

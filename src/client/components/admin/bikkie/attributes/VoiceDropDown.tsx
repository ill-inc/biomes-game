import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import type { VoicesListResponse } from "@/pages/api/voices/voices_list";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { sortBy } from "lodash";
import { useMemo } from "react";

export const VoiceDropDown: React.FunctionComponent<{
  voiceId: string;
  onChange: (voiceId: string) => void;
}> = ({ voiceId, onChange }) => {
  const { data: voices, loading } = useAsyncInitialDataFetch(async () => {
    return jsonFetch<VoicesListResponse>("/api/voices/voices_list");
  });

  const sortedVoices = useMemo(() => {
    return sortBy(voices?.voices, (e) => e.name);
  }, [voices, voices?.voices.length]);

  const currentlySelected = sortedVoices.find((e) => e.voiceId === voiceId);
  return (
    <DialogTypeaheadInput
      disabled={loading}
      value={currentlySelected}
      getDisplayName={(e) => e.name}
      options={sortedVoices}
      onChange={(option) => {
        if (!option) {
          return;
        }

        if (option.voiceId !== voiceId) {
          onChange(option.voiceId);
        }
      }}
    />
  );
};

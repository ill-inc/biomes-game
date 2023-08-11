import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ChromelessModal } from "@/client/components/modals/ChromelessModal";

import { DialogButton } from "@/client/components/system/DialogButton";
import { useValidHomestoneLocations } from "@/client/game/util/death";
import { warpToDestination } from "@/client/game/util/warping";
import { fireAndForget } from "@/shared/util/async";
import { motion } from "framer-motion";
import { useState } from "react";

export const HomestoneModal: React.FunctionComponent<{
  onClose: () => any;
}> = ({ onClose }) => {
  const clientContext = useClientContext();
  const { reactResources, table, userId } = clientContext;

  const [respawningAtName, setRespawningAtName] = useState<
    string | undefined
  >();

  const locations = useValidHomestoneLocations({
    userId,
    reactResources,
    table,
  });

  return (
    <ChromelessModal extraClassNames="homestone-modal" onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, y: "-5%" }}
        animate={{ opacity: 1, y: "0%" }}
        className="explanation"
        transition={{ bounce: 0.2, type: "spring" }}
      >
        Choose your destination:
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: "5%" }}
        animate={{ opacity: 1, y: "0%" }}
        transition={{ bounce: 0.2, type: "spring" }}
        className="actions"
      >
        {locations.map((e, i) => {
          return (
            <DialogButton
              key={e.name}
              onClick={() => {
                setRespawningAtName(e.name);
                fireAndForget(warpToDestination(clientContext, e.location));
              }}
              type={i == 0 ? "primary" : undefined}
              size="large"
              disabled={!!respawningAtName}
            >
              {respawningAtName === e.name ? `Warping` : `Warp to ${e.name}`}
              <div className="distance">{e.distance.toFixed(0)}m away</div>
            </DialogButton>
          );
        })}
        <DialogButton
          disabled={!!respawningAtName}
          size="large"
          onClick={() => {
            onClose();
          }}
        >
          Cancel
        </DialogButton>
      </motion.div>
    </ChromelessModal>
  );
};

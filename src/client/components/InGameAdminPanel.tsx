import { BikkieEditorWrapper } from "@/client/components/admin/bikkie/BikkieEditorWrapper";
import { BiscuitEditor } from "@/client/components/admin/bikkie/BiscuitEditor";
import AdvancedOptions from "@/client/components/AdvancedOptions";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InGameECSMode } from "@/client/components/InGameECS";
import { InGameECS } from "@/client/components/InGameECS";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { PaneSlideoverTitleBar } from "@/client/components/system/mini_phone/split_pane/PaneSlideover";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { capitalize } from "lodash";
import React, { useEffect, useRef, useState } from "react";

const ADMIN_PAGES = ["tweaks", "bikkie", "ecs"] as const;
export type IngameAdminPages = (typeof ADMIN_PAGES)[number];

const AdminMenu: React.FunctionComponent<{
  setPage: (page: IngameAdminPages) => unknown;
  activePage: IngameAdminPages;
}> = ({ setPage, activePage }) => {
  return (
    <div className="ingame-bikkie-submenu">
      <>
        {ADMIN_PAGES.map((page) => (
          <a
            key={page}
            href="#"
            className={`${activePage == page ? "selected" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setPage(page);
            }}
          >
            {capitalize(page)}
          </a>
        ))}
      </>
    </div>
  );
};

type BikkieSelectionMode = "auto" | "cursor";

export const InGameAdminPanel: React.FunctionComponent<{
  onClose?: () => void;
  onMount?: () => void;
  defaultTab: IngameAdminPages;
}> = ({ onClose, onMount, defaultTab }) => {
  const { reactResources } = useClientContext();

  const [bikkieSelectionMode, setBikkieSelectionMode] =
    useState<BikkieSelectionMode>("auto");
  const [ecsSelectionMode, setEcsSelectionMode] =
    useState<InGameECSMode>("auto");

  const currentBiscuit = reactResources.use("/admin/current_biscuit").id;

  const { hit } = reactResources.use("/scene/cursor");

  const [cursorEntity, setCursorEntity] = useState(INVALID_BIOMES_ID);
  const initialTargetEntityRef = useRef<ReadonlyEntity | undefined>(
    hit?.kind === "entity" ? hit?.entity : undefined
  );
  const [page, setPage] = useState<IngameAdminPages>(defaultTab);
  useEffect(() => {
    setPage(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    onMount?.();
  }, []);

  useEffect(() => {
    if (hit?.kind === "entity") {
      const { entity } = hit;
      if (entity.placeable_component) {
        setCursorEntity(entity.placeable_component.item_id);
      } else if (entity.npc_metadata) {
        setCursorEntity(entity.npc_metadata.type_id);
      } else if (entity.loose_item) {
        setCursorEntity(entity.loose_item.item.id);
      }
    } else if (hitExistingTerrain(hit)) {
      const block = terrainIdToBlock(hit.terrainId);
      if (block?.id) {
        setCursorEntity(block.id);
      }
    }
  }, [hit]);

  return (
    <div className="ingame-bikkie">
      <PaneSlideoverTitleBar onClose={onClose} titleBarStyle="unstyled">
        <BarTitle>
          <AdminMenu
            activePage={page}
            setPage={(page) => {
              setPage(page);
            }}
          />
        </BarTitle>
      </PaneSlideoverTitleBar>
      <LazyFragment isActive={page === "bikkie"} extraClassName="flex flex-col">
        <div className="ingame-bikkie-submenu p-1">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setBikkieSelectionMode("auto");
            }}
            className={`${bikkieSelectionMode === "auto" && "selected"}`}
          >
            Auto
          </a>{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setBikkieSelectionMode("cursor");
            }}
            className={`${bikkieSelectionMode === "cursor" && "selected"}`}
          >
            Cursor
          </a>
        </div>
        <BikkieEditorWrapper
          selectedId={
            bikkieSelectionMode === "auto" ? currentBiscuit : cursorEntity
          }
          setSelectedId={() => {
            throw new Error("Cannot change selection in-game.");
          }}
        >
          <BiscuitEditor narrowMode={true} />
        </BikkieEditorWrapper>
      </LazyFragment>

      <LazyFragment isActive={page === "tweaks"}>
        <AdvancedOptions />
      </LazyFragment>

      <LazyFragment isActive={page === "ecs"} extraClassName="flex flex-col">
        <div className="ingame-bikkie-submenu p-1">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setEcsSelectionMode("auto");
            }}
            className={`${ecsSelectionMode === "auto" && "selected"}`}
          >
            Auto
          </a>{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setEcsSelectionMode("self");
            }}
            className={`${ecsSelectionMode === "self" && "selected"}`}
          >
            Self
          </a>
          {initialTargetEntityRef.current && (
            <>
              {" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setEcsSelectionMode("initial");
                }}
                className={`${ecsSelectionMode === "initial" && "selected"}`}
              >
                Initial
              </a>
            </>
          )}
        </div>
        <InGameECS
          initialTarget={initialTargetEntityRef.current}
          mode={ecsSelectionMode}
        />
      </LazyFragment>
    </div>
  );
};

export default InGameAdminPanel;

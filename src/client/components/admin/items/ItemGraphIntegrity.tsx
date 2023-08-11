import { AdminInventoryCell } from "@/client/components/admin/AdminInventoryCell";
import { useItemGraph } from "@/client/components/admin/items/helpers";
import { conformsWith } from "@/shared/bikkie/core";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { countOf } from "@/shared/game/items";
import { assertNever } from "@/shared/util/type_helpers";
import { countBy } from "lodash";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";

const BiscuitGrid: React.FunctionComponent<{ biscuits: Biscuit[] }> = ({
  biscuits,
}) => {
  const router = useRouter();

  return (
    <div className="flex w-full flex-wrap gap-x-3 gap-y-1 p-5">
      {biscuits.map((e) => {
        return (
          <div key={e.id} className="w-5">
            <AdminInventoryCell
              slot={countOf(e, 1n)}
              label={e.displayName}
              onClick={() => void router.push(`/admin/bikkie/${e.id}`)}
            />
          </div>
        );
      })}
    </div>
  );
};

const allDrilldowns = [
  "orphaned",
  "no-recipe",
  "bad-drops",
  "duplicate-terrain",
] as const;
export type Drilldown = (typeof allDrilldowns)[number];
export const ItemGraphIntegrity: React.FunctionComponent<{}> = ({}) => {
  const graph = useItemGraph(false);
  const [drilldown, setDrilldown] = useState<Drilldown>(allDrilldowns[0]);

  const isItem = (biscuit: Biscuit) => {
    return conformsWith(bikkie.getSchema("/items"), biscuit);
  };

  const isNpc = (biscuit: Biscuit) => {
    return conformsWith(bikkie.getSchema("/npcs/types"), biscuit);
  };

  const drilldownName = useCallback(
    (drilldown: Drilldown) => {
      switch (drilldown) {
        case "orphaned":
          return "Orphaned Items";
        case "no-recipe":
          return "No recipe items";
        case "bad-drops":
          return "Bad Drop NPCs";
        case "duplicate-terrain":
          return "Duplicate Terrain";
      }
    },
    [drilldown]
  );
  const displayItems = useMemo(() => {
    switch (drilldown) {
      case "orphaned":
        return graph.nodes().filter((n) => {
          return (
            isItem(n.biscuit) &&
            graph.inbound(n.id).length === 0 &&
            !(n.biscuit.isFish || n.biscuit.deprecated)
          );
        });
      case "no-recipe":
        return graph.nodes().filter((n) => {
          return (
            isItem(n.biscuit) &&
            !graph.inbound(n.id).find((e) => e.kind === "recipe_makes") &&
            !(n.biscuit.isFish || n.biscuit.deprecated)
          );
        });
      case "bad-drops":
        return graph
          .nodes()
          .filter(
            (e) =>
              isNpc(e.biscuit) &&
              graph
                .outbound(e.id)
                .filter((e) => e.kind === "drops" && e.to !== 7539420629350495)
                .length === 0
          );
      case "duplicate-terrain":
        const terrainNameCount = countBy(
          graph.nodes().map((e) => e.biscuit.terrainName)
        );
        return graph.nodes().filter((e) => {
          const terrainName = e.biscuit.terrainName;
          return terrainName && terrainNameCount[terrainName] > 1;
        });

      default:
        assertNever(drilldown);
        return [];
    }
  }, [drilldown, graph]);

  return (
    <div className="flex h-screen">
      <div className="h-l w-1/4 overflow-auto">
        <ul>
          {allDrilldowns.map((e) => {
            return (
              <li
                key={e}
                className={`w-full cursor-pointer py-5 hover:bg-white/5 ${
                  drilldown === e ? "bg-white/5" : ""
                }`}
                onClick={() => {
                  setDrilldown(e);
                }}
              >
                {drilldownName(e)}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="h-full w-3/4 overflow-auto pb-10">
        {displayItems.length === 0 && "Loading"}
        <BiscuitGrid biscuits={displayItems.map((e) => e.biscuit)} />
      </div>
    </div>
  );
};

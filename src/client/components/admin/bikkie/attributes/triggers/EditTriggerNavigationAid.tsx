import { EntityIdEditor } from "@/client/components/admin/bikkie/attributes/EntityIdEditor";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { NavigationAid } from "@/shared/game/types";
import { INVALID_BIOMES_ID, isBiomesId, parseBiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import { toInteger, toNumber } from "lodash";

export function defaultNavigationAidOfKind(
  kind: NavigationAid["kind"]
): NavigationAid {
  switch (kind) {
    case "position":
      return {
        kind: "position",
        pos: [0, 0, 0],
      };
    case "npc":
      return {
        kind: "npc",
        npcTypeId: INVALID_BIOMES_ID,
      };
    case "entity":
      return {
        kind: "entity",
        id: INVALID_BIOMES_ID,
      };
    case "group":
      return {
        kind: "group",
        groupId: INVALID_BIOMES_ID,
      };
    case "active_campsite": // TODO: remove me
    case "deed": // TODO: remove me
    case "plot": // TODO: remove me
    case "robot":
      return {
        kind: "robot",
      };
  }
}

const XYZEntry: React.FunctionComponent<{
  position: Vec3;
  onChange: (position: Vec3) => unknown;
}> = ({ position, onChange }) => {
  return (
    <>
      <li>
        <label>X</label>
        <input
          type="number"
          defaultValue={position[0] || 0}
          onChange={(e) => {
            const x = toNumber(e.target.value);
            if (isNaN(x)) {
              return;
            }
            onChange([x, position[1], position[2]]);
          }}
        />
      </li>
      <li>
        <label>Y</label>
        <input
          type="number"
          defaultValue={position[1] || 0}
          onChange={(e) => {
            const y = toNumber(e.target.value);
            if (isNaN(y)) {
              return;
            }
            onChange([position[0], y, position[2]]);
          }}
        />
      </li>
      <li>
        <label>Z</label>
        <input
          type="number"
          defaultValue={position[2] || 0}
          onChange={(e) => {
            const z = toNumber(e.target.value);
            if (isNaN(z)) {
              return;
            }
            onChange([position[0], position[1], z]);
          }}
        />
      </li>
    </>
  );
};

const NavigationAidDetails: React.FunctionComponent<{
  navigationAid: NavigationAid;
  onChange: (NavigationAid: NavigationAid) => void;
}> = ({ navigationAid, onChange }) => {
  switch (navigationAid.kind) {
    case "group":
      return (
        <ul>
          <label> Group </label>
          <li>
            <input
              type="number"
              defaultValue={navigationAid.groupId}
              onChange={(e) => {
                const groupId = toInteger(e.target.value);
                if (!isBiomesId(groupId)) {
                  return;
                }
                onChange({
                  ...navigationAid,
                  groupId,
                });
              }}
            />
          </li>
        </ul>
      );
      break;
    case "entity":
      return (
        <ul>
          <li>
            <EntityIdEditor
              filter={"quest_givers"}
              value={navigationAid.id}
              onChange={(id) =>
                onChange({
                  ...navigationAid,
                  id,
                })
              }
            />
          </li>
        </ul>
      );
      break;
    case "npc":
      return (
        <ul>
          <li>
            <label>NPC</label>
            <select
              value={navigationAid.npcTypeId}
              onChange={(e) => {
                onChange({
                  ...navigationAid,
                  npcTypeId: parseBiomesId(e.target.value),
                });
              }}
            >
              {BikkieRuntime.get()
                .getBiscuits(bikkie.schema.npcs.types)
                .map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.displayName}
                  </option>
                ))}
            </select>
          </li>
        </ul>
      );
      break;
    case "position":
      return (
        <ul>
          <XYZEntry
            position={navigationAid.pos}
            onChange={(pos) => {
              onChange({
                ...navigationAid,
                pos,
              });
            }}
          />
        </ul>
      );
      break;
    case "robot":
      return <></>;
  }

  return <></>;
};

export const EditNavigationAid: React.FunctionComponent<{
  navigationAid: NavigationAid;
  onChange: (navigationAid: NavigationAid) => void;
}> = ({ navigationAid, onChange }) => {
  return (
    <>
      <li>
        <label> Aid Type </label>
        <select
          value={navigationAid.kind}
          onChange={(e) => {
            if (e.target.value === navigationAid.kind) {
              return;
            }

            onChange(
              defaultNavigationAidOfKind(
                e.target.value as NavigationAid["kind"]
              )
            );
          }}
        >
          {(["position", "npc", "entity", "group", "robot"] as const).map(
            (key) => (
              <option key={key} value={key}>
                {key}
              </option>
            )
          )}
        </select>
      </li>

      <NavigationAidDetails navigationAid={navigationAid} onChange={onChange} />
    </>
  );
};

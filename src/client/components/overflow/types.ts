import type { BiomesId } from "@/shared/ids";

export type InventoryLeftSlideoverStackPayload =
  | {
      type: "inventory_overflow";
    }
  | {
      type: "create_team";
    }
  | {
      type: "view_team";
      team_id: BiomesId;
    };

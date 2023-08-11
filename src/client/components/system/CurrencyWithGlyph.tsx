import type { ItemAndCount } from "@/shared/ecs/gen/types";
import { formatCurrencyItem } from "@/shared/util/view_helpers";

export const CurrencyWithGlyph: React.FunctionComponent<{
  itemAndCount: ItemAndCount;
  formatType?: "full" | "abbreviated" | "locale";
  option?: "show_zeros" | "hide_zeros";
}> = ({ itemAndCount, formatType, option }) => {
  return <>{formatCurrencyItem(itemAndCount, formatType, option)} Bling</>;
};

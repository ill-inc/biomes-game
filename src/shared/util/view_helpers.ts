import type { ItemAndCount } from "@/shared/ecs/extern";
import { itemCountToApproximateNumber } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import type {
  FeedPostBundle,
  SocialDocumentType,
  TaggedUserBundle,
} from "@/shared/types";
import { andify, removeVowels } from "@/shared/util/text";
import { ok } from "assert";

export function makeTickerSymbol(
  base: string,
  maxLength: number,
  prefix?: string
) {
  const prefixLength = prefix?.length ?? 0;
  const baseMaxLength = maxLength - prefixLength;
  let voxelSymbol = base.replaceAll("_", "").replaceAll(" ", "").toUpperCase();
  if (voxelSymbol.length > baseMaxLength) {
    voxelSymbol = removeVowels(voxelSymbol);
    if (voxelSymbol.length > baseMaxLength) {
      voxelSymbol = voxelSymbol.substr(0, baseMaxLength);
    }
  }

  return `${prefix ? prefix : ""}${voxelSymbol}`;
}

export function epochMsToDuration(epochMs: number) {
  const elapsedSeconds = (Date.now() - epochMs) / 1000;
  if (elapsedSeconds < 60) {
    return "now";
  } else if (elapsedSeconds < 60 * 60) {
    const elapsedMinutes = Math.ceil(elapsedSeconds / 60);
    return `${elapsedMinutes}m`;
  } else if (elapsedSeconds < 24 * 60 * 60) {
    const elapsedHours = Math.ceil(elapsedSeconds / (60 * 60));
    return `${elapsedHours}h`;
  } else {
    const elapsedDays = Math.ceil(elapsedSeconds / (24 * 60 * 60));
    return `${elapsedDays}d`;
  }
}

/* text only used for Discord Bot */
export function photoFeaturingString(bundle: FeedPostBundle) {
  const otherUsers = bundle.taggedObjects.filter(
    (e) => e.kind === "user" && e.bundle.id !== bundle.userId
  ) as TaggedUserBundle[];

  const objectNames = otherUsers.map((e) => e.bundle.username ?? "a user");

  if (objectNames.length === 0) {
    return "";
  } else {
    return `with ${andify(objectNames)}`;
  }
}

export function formatCurrencyItem(
  itemAndCount: ItemAndCount,
  formatType: "full" | "abbreviated" | "locale" = "full",
  option: "show_zeros" | "hide_zeros" = "show_zeros"
): string {
  ok(itemAndCount.item.isCurrency);
  return formatCurrency(
    itemAndCount.item.id,
    itemAndCount.count,
    formatType,
    option
  );
}

export function maybeFormatCurrency(
  type?: BiomesId,
  balance?: bigint,
  formatType: "full" | "abbreviated" | "locale" = "full",
  option: "show_zeros" | "hide_zeros" = "show_zeros"
) {
  if (type === undefined || balance === undefined) {
    return "???";
  }
  return formatCurrency(type, balance, formatType, option);
}

export function formatCurrency(
  type: BiomesId,
  balance: bigint,
  formatType: "full" | "abbreviated" | "locale" = "full",
  option: "show_zeros" | "hide_zeros" = "show_zeros"
): string {
  let decimalPrecision = 0;
  const full = Number(balance);
  if (formatType === "abbreviated") {
    let suffix = "";
    let base = 1;
    if (full >= 1e3 && full < 1e6) {
      // Thousands
      base = 1e3;
      suffix = "k";
      decimalPrecision = 1;
    } else if (full >= 1e6 && full < 1e9) {
      // Millions
      base = 1e6;
      suffix = "m";
      decimalPrecision = 1;
    } else if (full >= 1e9) {
      // Billions
      base = 1e9;
      suffix = "b";
      decimalPrecision = 1;
    } else if (full >= 1e12) {
      // Billions
      base = 1e12;
      suffix = "t";
      decimalPrecision = 1;
    }
    const divided = Number(balance / BigInt(base));
    // Show decimals for suffixed values when they are significant
    // and show decmials for unsuffixed values unless showZeroDecimals is false.
    const decimals = Math.floor((divided % 1.0) * 10 ** decimalPrecision);
    if (option === "hide_zeros" && decimals === 0) {
      decimalPrecision = 0;
    }
    return (
      (decimals || suffix === ""
        ? divided.toFixed(decimalPrecision)
        : divided.toFixed(0)) + suffix
    );
  } else if (formatType === "locale") {
    return full.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return full.toFixed(decimalPrecision);
}

export function formatItemCount(itemAndCount: ItemAndCount): string {
  const full = itemCountToApproximateNumber(itemAndCount);
  return full % 1.0 >= 0.09 ? full.toFixed(1) : full.toFixed(0);
}

export function socialDocumentTypeToUserString(
  documentType: SocialDocumentType
) {
  switch (documentType) {
    case "environment_group":
      return "build";
    case "post":
      return "photo";
  }
}

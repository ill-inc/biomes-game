import { prettyFishLength } from "@/client/components/chat/CatchMessageView";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { hasIconUrl, iconUrl } from "@/client/components/inventory/icons";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { useCanAffordMinigameEntry } from "@/client/components/minigames/helpers";
import { DialogButton } from "@/client/components/system/DialogButton";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import {
  LeftPaneDrilldown,
  LeftPaneDrilldownItem,
} from "@/client/components/system/LeftPaneDrilldown";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { MiniPhoneMoreItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import { minigameName } from "@/client/game/util/minigames";
import { createOrJoinMinigame } from "@/client/game/util/warping";
import { useAsyncInitialDataFetch } from "@/client/util/hooks";
import {
  useCachedLeaderboardValue,
  useCachedPostBundle,
} from "@/client/util/social_manager_hooks";
import { ordinalize } from "@/client/util/text_helpers";
import type { ReadyGamesRequest } from "@/pages/api/minigames/ready_games";
import { zReadyGamesResponse } from "@/pages/api/minigames/ready_games";
import {
  absoluteWebServerURL,
  minigamePublicPermalink,
} from "@/server/web/util/urls";
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import { getBiscuit, getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { Item, LifetimeStatsType } from "@/shared/ecs/gen/types";
import { isFloraId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import {
  bagCount,
  countOf,
  itemCountToApproximateNumber,
} from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import { zjsonPost } from "@/shared/util/fetch_helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { formatCurrency } from "@/shared/util/view_helpers";
import { motion } from "framer-motion";
import { capitalize, difference, some, sortBy } from "lodash";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type CollectionsPage =
  | "fish"
  | "blocks"
  | "consumables"
  | "minigames"
  | "farming"
  | "snapped";

function getCollectionCategory(item: Item) {
  // Default to collection category if defined, otherwise infer from other attributes
  if (item.collectionCategory) {
    return item.collectionCategory;
  } else if (item.isMuckwaterFish) {
    return BikkieIds.collectionMuckwaterFish;
  } else if (item.isClearwaterFish) {
    return BikkieIds.collectionClearwaterFish;
  } else if (item.isSeed) {
    return BikkieIds.collectionPlants;
  }
  return INVALID_BIOMES_ID;
}

function growthSeedsToUnlockCount(numGrown: number) {
  // This could maybe be an exponential growth thing in the future?
  // i.e. 10 = 1, 30 = 2, 60 = 3, etc
  return Math.floor(numGrown / 10);
}

export const CollectionsPageContext = createContext<{
  showDebug?: boolean;
}>({});

const FarmingTooltip: React.FunctionComponent<{
  itemId: BiomesId;
}> = ({ itemId }) => {
  const { userId, reactResources } = useClientContext();
  const collectionStats = reactResources.use(
    "/ecs/c/lifetime_stats",
    userId
  )?.stats;
  const item = anItem(itemId);
  const displayItem = item?.collectionDisplayItem
    ? anItem(item.collectionDisplayItem)
    : item;
  const numGrown =
    (collectionStats &&
      itemCountToApproximateNumber(
        countOf(
          item,
          bagCount(collectionStats.get("grown"), item, {
            respectPayload: false,
          })
        )
      )) ??
    0;

  const hasCrossbreeds = some(
    item?.farming?.crossbreeds?.map((crossbreed) => crossbreed.seeds.length > 0)
  );
  const [visibleSeeds, remainingUnlocks] = useMemo(() => {
    // Show seeds based on number of the plant grown.
    const seenSeeds = new Set<BiomesId>();
    let crossbreedInfoUnlocks = growthSeedsToUnlockCount(numGrown);
    for (const crossbreed of item?.farming?.crossbreeds ?? []) {
      for (const seed of crossbreed.seeds) {
        if (seenSeeds.has(seed)) {
          continue;
        } else if (crossbreedInfoUnlocks > 0) {
          seenSeeds.add(seed);
          crossbreedInfoUnlocks -= 1;
        }
      }
    }
    return [seenSeeds, crossbreedInfoUnlocks];
  }, [item, numGrown]);
  // Any remaining unlocks, use it for chances
  const chancesVisible = remainingUnlocks;

  return (
    <>
      <span className="displayName">{displayItem?.displayName}</span>
      <div className="tertiary-label">{numGrown} grown.</div>
      {hasCrossbreeds && (
        <>
          <label>Crossbreeds</label>
          {visibleSeeds.size > 0 ? (
            <ul>
              {item?.farming?.crossbreeds?.map((crossbreed, i) => {
                if (
                  crossbreed.seeds.filter((seed) => visibleSeeds.has(seed))
                    .length === 0
                ) {
                  return <></>;
                }
                return (
                  <li key={i} className={"collections-detail-crossbreed-entry"}>
                    <div className={"collections-detail-crossbreed-chance"}>
                      {i < chancesVisible
                        ? capitalize(crossbreed.chance)
                        : "???"}{" "}
                      chance
                    </div>
                    <ul>
                      {crossbreed.seeds.map((seed, i) => {
                        const seedItem = anItem(seed);
                        return (
                          <li
                            key={i}
                            className={
                              "collections-detail-crossbreed-entry-seed"
                            }
                          >
                            {visibleSeeds.has(seed) ? (
                              <>
                                <ItemTooltip
                                  slotType="inventory"
                                  item={seedItem}
                                >
                                  <motion.img
                                    whileHover={{ scale: 1.1 }}
                                    src={iconUrl(seedItem)}
                                    draggable={false}
                                  />
                                </ItemTooltip>
                                {anItem(seed)?.displayName}
                              </>
                            ) : (
                              <>???</>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          ) : (
            "???"
          )}
        </>
      )}
    </>
  );
};

const CollectionsTooltip: React.FunctionComponent<
  PropsWithChildren<{
    itemId: BiomesId;
    statsKey: LifetimeStatsType;
  }>
> = ({ itemId, statsKey, children }) => {
  const item = anItem(itemId);
  const displayItem = item?.collectionDisplayItem
    ? anItem(item.collectionDisplayItem)
    : item;
  if (statsKey === "grown") {
    return (
      <Tooltipped tooltip={<FarmingTooltip itemId={itemId} />}>
        {children}
      </Tooltipped>
    );
  }
  return (
    <ItemTooltip slotType="inventory" item={displayItem}>
      {children}
    </ItemTooltip>
  );
};

export const FishLeaderboardUpsell: React.FunctionComponent<{
  itemId: BiomesId;
}> = ({ itemId }) => {
  const { userId, socialManager } = useClientContext();
  const leaderboardPosition = useCachedLeaderboardValue(
    socialManager,
    userId,
    { id: itemId, kind: "fished_length" },
    "alltime",
    "DESC"
  );

  return (
    <div className="leaderboard-sell">
      {leaderboardPosition ? (
        <>
          Ranked {ordinalize(leaderboardPosition.rank + 1)}:{" "}
          {prettyFishLength(leaderboardPosition.value)}
        </>
      ) : (
        <>&nbsp;</>
      )}
    </div>
  );
};

export const NormalLeaderboardUpsell: React.FunctionComponent<{
  itemId: BiomesId;
  statsKey: LifetimeStatsType;
  verb?: string;
}> = ({ itemId, statsKey, verb }) => {
  const { userId, reactResources } = useClientContext();
  const collectionStats = reactResources.use("/ecs/c/lifetime_stats", userId);
  const item = anItem(itemId);
  const numCollected = bagCount(collectionStats?.stats.get(statsKey), item, {
    respectPayload: false,
  });
  const countCollected = countOf(item, numCollected);

  return (
    <div className="leaderboard-sell">
      <>
        {itemCountToApproximateNumber(countCollected)} {verb ?? statsKey}
      </>
    </div>
  );
};

export const CollectionsItem: React.FunctionComponent<{
  itemId: BiomesId;
  statsKey: LifetimeStatsType;
  hasCollected: boolean;
  verb?: string;
}> = ({ itemId, statsKey, hasCollected, verb }) => {
  const item = anItem(itemId);
  const displayItem = item?.collectionDisplayItem
    ? anItem(item.collectionDisplayItem)
    : item;
  const { showDebug } = useContext(CollectionsPageContext);
  return (
    <div
      className={`collections-item ${
        hasCollected || showDebug ? "collected" : "uncollected"
      }`}
    >
      {hasCollected || showDebug ? (
        <CollectionsTooltip itemId={itemId} statsKey={statsKey}>
          <motion.img
            whileHover={{ scale: 1.1 }}
            src={iconUrl(displayItem)}
            draggable={false}
          />
          {statsKey === "fished" ? (
            <FishLeaderboardUpsell itemId={itemId} />
          ) : statsKey !== "grown" ? (
            <NormalLeaderboardUpsell
              itemId={itemId}
              statsKey={statsKey}
              verb={verb}
            />
          ) : (
            <></>
          )}
          {showDebug && itemId}
        </CollectionsTooltip>
      ) : (
        <>
          <Tooltipped tooltip="?">
            <ItemIcon item={displayItem} draggable={false} />
          </Tooltipped>
          <div className="leaderboard-sell">&nbsp;</div>
        </>
      )}
    </div>
  );
};

const CollectionsCategory: React.FunctionComponent<{
  name?: string;
  items: Item[];
  statsKey: LifetimeStatsType;
}> = ({ name, items, statsKey }) => {
  const { reactResources, userId } = useClientContext();
  const stats = reactResources.use("/ecs/c/lifetime_stats", userId)?.stats;

  const hasCollected = useCallback(
    (item: Item) => {
      return stats
        ? bagCount(stats.get(statsKey), item, {
            respectPayload: false,
          }) > 0
        : false;
    },
    [reactResources.version("/ecs/c/lifetime_stats", userId)]
  );

  const orderedCollection = useMemo(() => {
    if (statsKey === "takenPhoto") {
      return sortBy(items, (e) => (hasCollected(e) ? 0 : 1));
    }

    return items;
  }, [hasCollected, items]);

  return (
    <div className={"collections-category"}>
      {name && <label>{name}</label>}
      <div className={"collections-items"}>
        {orderedCollection.map((item) => (
          <CollectionsItem
            key={item.id}
            itemId={item.id}
            statsKey={statsKey}
            verb={statsKey === "takenPhoto" ? "Snapped" : undefined}
            hasCollected={hasCollected(item)}
          />
        ))}
      </div>
    </div>
  );
};

export const CollectionsPageComponent: React.FunctionComponent<{
  page: CollectionsPage;
}> = ({ page }) => {
  const [items, statsKey] = useMemo((): [Item[], LifetimeStatsType] => {
    let items: Array<Item> = [];
    let stats: LifetimeStatsType = "collected";
    switch (page) {
      case "fish":
        items = getBiscuits(bikkie.schema.items.fish);
        stats = "fished";
        break;
      case "consumables":
        items = getBiscuits(bikkie.schema.items.consumables);
        stats = "consumed";
        break;
      case "blocks":
        items = getBiscuits(bikkie.schema.blocks).filter((b) => {
          const terrainId = safeGetTerrainId(b.terrainName);
          if (!terrainId) {
            return false;
          }
          return !isFloraId(terrainId);
        });
        break;
      case "farming":
        items = getBiscuits(bikkie.schema.items.seed);
        stats = "grown";
        break;
      case "snapped":
        items = [
          ...getBiscuits(bikkie.schema.npcs.types),
          ...getBiscuits(bikkie.schema.items.placeables),
        ];
        stats = "takenPhoto";
    }

    return [items.filter((item) => hasIconUrl(item)), stats];
  }, [page]);

  const categories = useMemo(() => {
    const categories = new DefaultMap<BiomesId | undefined, Item[]>(() => []);
    for (const item of items) {
      categories.get(getCollectionCategory(item)).push(item);
    }
    return categories;
  }, [items]);

  const { authManager } = useClientContext();
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const [showDebug, setShowDebug] = useState(false);

  return (
    <CollectionsPageContext.Provider value={{ showDebug }}>
      <div className="collections-page">
        {isAdmin && (
          <div className="opacity-25">
            <label>
              Debug
              <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                className="m-0.1"
              />
            </label>
          </div>
        )}
        {categories.get(INVALID_BIOMES_ID).length > 0 && (
          <CollectionsCategory
            items={categories.get(INVALID_BIOMES_ID)}
            statsKey={statsKey}
          />
        )}
        {[...categories.entries()].map(([categoryId, items]) => {
          if (
            !categoryId ||
            categoryId === INVALID_BIOMES_ID ||
            items.length === 0
          ) {
            return <></>;
          }
          const category = getBiscuit(categoryId);
          if (category.isHidden) {
            return <></>;
          }
          return (
            <CollectionsCategory
              key={categoryId}
              name={category.displayName}
              items={items}
              statsKey={statsKey}
            />
          );
        })}
      </div>
    </CollectionsPageContext.Provider>
  );
};

const MinigameBrowserRow: React.FunctionComponent<{
  minigame: Entity;
  enablePlay: boolean;
  onClick?: () => void;
}> = ({ minigame, enablePlay, onClick }) => {
  const clientContext = useClientContext();
  const { socialManager, userId, authManager } = clientContext;
  const [copyLinkText, setCopyLinkText] = useState("Copy Link");
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<GenericMiniPhonePayload>();
  const creatorId = minigame.created_by?.id ?? INVALID_BIOMES_ID;
  const post = useCachedPostBundle(
    socialManager,
    minigame.minigame_component?.hero_photo_id
  );
  const thumbnail = post ? imageUrlForSize("thumbnail", post?.imageUrls) : "";

  const url = absoluteWebServerURL(
    minigamePublicPermalink(minigame.id, minigame.label?.text)
  );

  const copyLink = useCallback(() => {
    void navigator.clipboard.writeText(url);
    setCopyLinkText("Copied");
    setTimeout(() => {
      setCopyLinkText("Copy Link");
    }, 500);
  }, []);

  const [showMore, setShowMore] = useState(false);
  const [clickPoint, setClickPoint] = useState<[number, number]>([0, 0]);

  const [canAfford, entryPrice] = useCanAffordMinigameEntry(minigame.id);
  const priceStr = entryPrice
    ? ` for ${formatCurrency(BikkieIds.bling, entryPrice)} Bling`
    : "";

  const moreItems: MoreMenuItem[] = [];

  moreItems.push({
    label: copyLinkText,
    onClick: copyLink,
  });

  if (userId === creatorId || authManager.currentUser.hasSpecialRole("admin")) {
    moreItems.push({
      label: "Edit",
      onClick: () => {
        pushNavigationStack({
          type: "minigame_edit",
          minigameId: minigame.id,
        });
      },
    });
  }

  return (
    <div
      className="collections-item minigame-collections-item"
      onClick={onClick}
    >
      <div className="group relative">
        <ShadowedImage src={post ? thumbnail : ""} />
        <div className=" absolute right-1 top-0.2 w-2">
          <MiniPhoneMoreItem
            onClick={(e) => {
              setShowMore(!showMore);
              setClickPoint([e.clientX, e.clientY]);
            }}
          />
          <MoreMenu
            items={moreItems}
            showing={showMore}
            setShowing={setShowMore}
            pos={clickPoint}
          />
        </div>

        <div className="absolute bottom-1 right-1 ">
          {enablePlay && (
            <Tooltipped tooltip={priceStr}>
              <DialogButton
                extraClassNames="btn-inline"
                size="small"
                type="primary"
                disabled={!canAfford}
                onClick={async () => {
                  await createOrJoinMinigame(clientContext, minigame.id);
                  clientContext.reactResources.set("/game_modal", {
                    kind: "empty",
                  });
                }}
              >
                Play
              </DialogButton>
            </Tooltipped>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <div className="attribution flex-grow">{minigameName(minigame)}</div>
      </div>
    </div>
  );
};

export const MinigameBrowserComponent: React.FunctionComponent<{
  onGameClick?: (minigameId: BiomesId) => unknown;
  enablePlay: boolean;
}> = ({ onGameClick, enablePlay }) => {
  const { authManager } = useClientContext();
  const [error, setError] = useError();
  const { data, loading } = useAsyncInitialDataFetch(async () => {
    const games = await zjsonPost<
      ReadyGamesRequest,
      typeof zReadyGamesResponse
    >("/api/minigames/ready_games", {}, zReadyGamesResponse);
    return games.games.map((e) => e.entity);
  }, setError);

  const gamesWithThumbnails = data
    ? data.filter((game) => game.minigame_component?.hero_photo_id)
    : [];
  const gamesWithoutThumbnails = difference(data, gamesWithThumbnails);

  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  if (loading) {
    return <div>Loading... </div>;
  }

  return (
    <>
      <MaybeError error={error} />
      {data?.length === 0 && <>No games found!</>}
      <div className="collections-page">
        <div className="collections-category">
          <div className="collections-items grid-cols-3">
            {gamesWithThumbnails?.map((e) => (
              <MinigameBrowserRow
                enablePlay={enablePlay}
                key={e.id}
                minigame={e}
                onClick={() => {
                  onGameClick?.(e.id);
                }}
              />
            ))}
          </div>

          {isAdmin && (
            <>
              <label>ALL GAMES — ADMIN ONLY</label>
              <div className="collections-items grid-cols-3">
                {gamesWithoutThumbnails?.map((e) => (
                  <MinigameBrowserRow
                    enablePlay={enablePlay}
                    key={e.id}
                    minigame={e}
                    onClick={() => {
                      onGameClick?.(e.id);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export const CollectionsScreen: React.FunctionComponent<{
  page?: CollectionsPage;
}> = ({ page: initialPage }) => {
  const [page, setPage] = useState<CollectionsPage>(initialPage ?? "snapped");

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title="Collections" />
      <LeftPane>
        <LeftPaneDrilldown>
          <LeftPaneDrilldownItem
            title="Snapped"
            icon={iconUrl(getBiscuit(BikkieIds.camera))}
            onClick={() => setPage("snapped")}
            selected={page === "snapped"}
          />
          <LeftPaneDrilldownItem
            title="Blocks"
            icon={iconUrl(getBiscuit(BikkieIds.grass))}
            onClick={() => setPage("blocks")}
            selected={page === "blocks"}
          />
          <LeftPaneDrilldownItem
            title="Fish"
            icon={iconUrl(getBiscuit(BikkieIds.fish))}
            onClick={() => setPage("fish")}
            selected={page === "fish"}
          />
          <LeftPaneDrilldownItem
            title="Food & Drink"
            icon={iconUrl(getBiscuit(BikkieIds.bizzyCola))}
            onClick={() => setPage("consumables")}
            selected={page === "consumables"}
          />
          <LeftPaneDrilldownItem
            title="Farming"
            icon={iconUrl(getBiscuit(BikkieIds.oakSeed))}
            onClick={() => setPage("farming")}
            selected={page === "farming"}
          />
          <LeftPaneDrilldownItem
            title="Games"
            icon={iconUrl(getBiscuit(BikkieIds.arcadeMachine))}
            onClick={() => setPage("minigames")}
            selected={page === "minigames"}
          />
        </LeftPaneDrilldown>
      </LeftPane>
      <RightPane>
        <LazyFragment isActive={page === "snapped"}>
          <CollectionsPageComponent page="snapped" />
        </LazyFragment>
        <LazyFragment isActive={page === "fish"}>
          <CollectionsPageComponent page="fish" />
        </LazyFragment>
        <LazyFragment isActive={page === "consumables"}>
          <CollectionsPageComponent page="consumables" />
        </LazyFragment>
        <LazyFragment isActive={page === "blocks"}>
          <CollectionsPageComponent page="blocks" />
        </LazyFragment>
        <LazyFragment isActive={page === "farming"}>
          <CollectionsPageComponent page="farming" />
        </LazyFragment>
        <LazyFragment isActive={page === "minigames"}>
          <MinigameBrowserComponent enablePlay />
        </LazyFragment>
      </RightPane>
    </SplitPaneScreen>
  );
};

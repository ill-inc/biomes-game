import { AdminInventoryCell } from "@/client/components/admin/AdminInventoryCell";
import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { AdminUserTitle } from "@/client/components/admin/AdminUserTitle";
import {
  useBikkieLoaded,
  useEntityAdmin,
} from "@/client/components/hooks/client_hooks";
import { INVENTORY_COLS } from "@/client/components/inventory/helpers";
import { DialogButton } from "@/client/components/system/DialogButton";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.module.css";
import { sanitizeServerSideProps } from "@/client/util/next_helpers";
import type { ChangeRoleRequest } from "@/pages/api/admin/change_role";
import type { DisableRequest } from "@/pages/api/admin/disable";
import type { GiveItemRequest } from "@/pages/api/admin/give_item";
import type { LogoutRequest } from "@/pages/api/admin/logout";
import type { PublishEcsEventsRequest } from "@/pages/api/admin/publish_ecs_events";
import type { ProgressQuestsRequest } from "@/pages/api/admin/quests/progress";
import type { ResetQuestsRequest } from "@/pages/api/admin/quests/reset";
import type { ResetRecipesRequest } from "@/pages/api/admin/recipes/reset";
import type { ResetInventoryRequest } from "@/pages/api/admin/reset_inventory";
import type { ResetInventoryOverflowRequest } from "@/pages/api/admin/reset_inventory_overflow";
import type { ResetPlayerRequest } from "@/pages/api/admin/reset_player";
import {
  fetchCanLoginWith,
  usernameOrIdToUser,
  zUsernameOrId,
} from "@/server/web/util/admin";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { googleErrorConsoleURL } from "@/server/web/util/urls";
import type { SpecialRoles } from "@/shared/acl_types";
import { ALL_SPECIAL_ROLES } from "@/shared/acl_types";
import { getBiscuits } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { RecipeBook } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import type { AnyEvent } from "@/shared/ecs/gen/events";
import { AdminRemoveItemEvent } from "@/shared/ecs/gen/events";
import type {
  ChallengeState,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import { WrappedEvent } from "@/shared/ecs/zod";
import { anItem } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import { itemBagToString } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import { mapMap } from "@/shared/util/collections";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { motion } from "framer-motion";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useState } from "react";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      id: zUsernameOrId,
    }),
  },
  async ({ context: { db, sessionStore }, query: { id: idOrUsername } }) => {
    const user = await usernameOrIdToUser(db, idOrUsername);

    const [sessionCount, canLoginWith] = await Promise.all([
      sessionStore.countSessions(user?.id),
      fetchCanLoginWith(db, user?.id),
    ]);

    return {
      props: sanitizeServerSideProps({
        user,
        sessionCount,
        canLoginWith,
      }),
    };
  }
);

async function publishEcsEvents(
  events: Array<[userId: BiomesId, event: AnyEvent]>
) {
  await jsonPost<void, PublishEcsEventsRequest>(
    "/api/admin/publish_ecs_events",
    {
      userIdsAndEventBlobs: events.map(([userId, e]) => [
        userId,
        JSON.stringify(new WrappedEvent(e).prepareForZrpc()),
      ]),
    }
  );
}

const InventoryOverflowSection: React.FunctionComponent<{
  user: Entity;
}> = ({ user }) => {
  const [inFlight, setInFlight] = useState(false);
  const router = useRouter();
  const clearInventoryOverflow = useCallback(async () => {
    setInFlight(true);
    try {
      await jsonPost<void, ResetInventoryOverflowRequest>(
        "/api/admin/reset_inventory_overflow",
        {
          userId: user.id,
        }
      );
      router.reload();
    } finally {
      setInFlight(false);
    }
  }, []);

  return (
    <>
      <div className={styles["admin-inventory"]}>
        {user?.inventory?.overflow &&
          mapMap(user?.inventory?.overflow, (itemAndCount, key) => (
            <AdminInventoryCell key={key} slot={itemAndCount} />
          ))}
      </div>
      <div>
        <DialogButton
          extraClassNames="btn-inline"
          disabled={inFlight}
          onClick={() =>
            confirm("Are you sure you want to clear Inventory Overflow?") &&
            void clearInventoryOverflow()
          }
        >
          Clear Inventory Overflow Contents
        </DialogButton>
      </div>
    </>
  );
};

const ChallengeRow: React.FunctionComponent<{
  userId: BiomesId;
  challenge: BiomesId;
}> = ({ userId, challenge }) => {
  const [isBusy, setIsBusy] = useState(false);
  const setChallengeState = useCallback(
    (state: ChallengeState) => {
      return () => {
        setIsBusy(true);
        void jsonPost<void, ResetQuestsRequest>("/api/admin/quests/reset", {
          userId,
          challengeStateMap: {
            [challenge]: state,
          },
        }).finally(() => setIsBusy(false));
      };
    },
    [challenge]
  );

  const progressChallenge = useCallback(() => {
    setIsBusy(true);
    void jsonPost<void, ProgressQuestsRequest>("/api/admin/quests/progress", {
      userId,
      questId: challenge,
    }).finally(() => setIsBusy(false));
  }, [challenge]);

  return (
    <div className="grid grid-cols-5">
      <a href={`/admin/bikkie/${challenge}`} key={challenge}>
        {anItem(challenge).displayName}
      </a>
      <button
        className="button dialog-button"
        onClick={setChallengeState("start")}
        disabled={isBusy}
      >
        lock
      </button>
      <button
        className="button dialog-button"
        onClick={setChallengeState("available")}
        disabled={isBusy}
      >
        available
      </button>
      <button
        className="button dialog-button"
        onClick={progressChallenge}
        disabled={isBusy}
      >
        progress
      </button>
      <button
        className="button dialog-button"
        onClick={setChallengeState("completed")}
        disabled={isBusy}
      >
        complete
      </button>
    </div>
  );
};

const ChallengesSection: React.FunctionComponent<{ user: Entity }> = ({
  user,
}) => {
  const [inFlight, setInFlight] = useState(false);

  const router = useRouter();
  const clearChallenges = useCallback(async () => {
    // TODO clearing challenges should implicitly clear all flags
    setInFlight(true);
    try {
      await jsonPost<void, ResetQuestsRequest>("/api/admin/quests/reset", {
        userId: user.id,
        resetAll: true,
        challengeStateMap: {},
      });
      router.reload();
    } finally {
      setInFlight(false);
    }
  }, []);

  return (
    <div>
      <h4>In-Progress</h4>
      <ul className="flex flex-col">
        {[...(user.challenges?.in_progress || [])].map((challenge) => (
          <ChallengeRow
            key={challenge}
            userId={user.id}
            challenge={challenge}
          />
        ))}
      </ul>
      <h4>Available</h4>
      <ul className="flex flex-col">
        {[...(user.challenges?.available || [])].map((challenge) => (
          <ChallengeRow
            key={challenge}
            userId={user.id}
            challenge={challenge}
          />
        ))}
      </ul>
      <h4>Completed</h4>
      <ul className="flex flex-col">
        {[...(user.challenges?.complete || [])].map((challenge) => (
          <ChallengeRow
            key={challenge}
            userId={user.id}
            challenge={challenge}
          />
        ))}
      </ul>
      <div>
        <DialogButton
          extraClassNames="btn-inline"
          disabled={inFlight}
          onClick={() =>
            confirm("Are you sure you want to clear all challenges?") &&
            void clearChallenges()
          }
        >
          Clear All Challenges
        </DialogButton>
      </div>
    </div>
  );
};

export const AdminRecipePage: React.FunctionComponent<{
  userId: BiomesId;
  recipeBook: RecipeBook;
}> = ({ userId, recipeBook }) => {
  const [error, setError] = useError();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const resetRecipes = useCallback(async () => {
    const isConfirmed = confirm("Really reset ALL recipes for player?");

    if (!isConfirmed) {
      return;
    }

    try {
      setLoading(true);
      await jsonPost<void, ResetRecipesRequest>("/api/admin/recipes/reset", {
        userId,
      });
      router.reload();
    } catch (error: any) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const bag = createBag(
        ...getBiscuits(bikkie.schema.recipes).map((x) => countOf(x))
      );

      await jsonPost<void, GiveItemRequest>("/api/admin/give_item", {
        userId,
        giveTarget: "inventory",
        serializedBag: itemBagToString(bag),
      });
      router.reload();
    } catch (error: any) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="recipes">
      <MaybeError error={error} />
      <a href="#" onClick={() => setShowAllRecipes(!showAllRecipes)}>
        Recipe book has {recipeBook.recipes.size} entries{" "}
        <motion.span
          className="inline-block"
          animate={{ rotateZ: showAllRecipes ? 90 : 0 }}
        >
          ►
        </motion.span>
      </a>
      {showAllRecipes && (
        <ul>
          {mapMap(recipeBook.recipes, (item, key) => (
            <li>
              <a href={`/admin/bikkie/${key}`} key={key}>
                {item.displayName === "???" ? item.name : item.displayName}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1 py-2">
        <DialogButton
          extraClassNames="btn-inline"
          onClick={() => {
            void resetRecipes();
          }}
          disabled={loading}
        >
          Reset All Recipes
        </DialogButton>
        <DialogButton
          extraClassNames="btn-inline"
          onClick={() => {
            confirm(
              "Are you sure you want to unlock all recipes for this player?"
            ) && void unlockRecipes();
          }}
          disabled={loading}
        >
          Unlock All Recipes
        </DialogButton>
      </div>
    </div>
  );
};

export const AdminEditPlayerEntity: React.FunctionComponent<{
  playerEntity: Entity;
  setError?: (error: any) => any;
}> = ({ playerEntity, setError }) => {
  const [inventoryChanging, setInventoryChanging] = useState(false);
  const [selectedInventoryRef, setSelectedInventoryRef] = useState<
    undefined | OwnedItemReference
  >();
  const router = useRouter();
  const removeFromInventory = useCallback(async (ref: OwnedItemReference) => {
    try {
      setInventoryChanging(true);
      await publishEcsEvents([
        [
          playerEntity.id,
          new AdminRemoveItemEvent({ id: playerEntity.id, ref }),
        ],
      ]);
      router.reload();
    } catch (error: any) {
      setError?.(error);
    } finally {
      setInventoryChanging(false);
    }
  }, []);

  const resetInventory = useCallback(async () => {
    try {
      setInventoryChanging(true);
      await jsonPost<void, ResetInventoryRequest>(
        "/api/admin/reset_inventory",
        {
          userId: playerEntity.id,
        }
      );
      router.reload();
    } catch (error: any) {
      setError?.(error);
    } finally {
      setInventoryChanging(false);
    }
  }, []);

  const [resettingPlayer, setResettingPlayer] = useState(false);
  const resetPlayer = useCallback(async () => {
    try {
      setResettingPlayer(true);
      await jsonPost<void, ResetPlayerRequest>("/api/admin/reset_player", {
        userId: playerEntity.id,
      });
      router.reload();
    } catch (error: any) {
      setError?.(error);
    } finally {
      setResettingPlayer(false);
    }
  }, []);

  return (
    <ul className={styles["admin-page-list"]}>
      {playerEntity?.recipe_book && (
        <li>
          <h2> Recipes </h2>
          <AdminRecipePage
            userId={playerEntity.id}
            recipeBook={playerEntity.recipe_book}
          />
        </li>
      )}
      <li>
        <h2>Inventory</h2>
        <div className={styles["admin-inventory"]}>
          {(playerEntity?.inventory?.items ?? []).map((slot, idx) => (
            <React.Fragment key={`slot${idx}`}>
              <AdminInventoryCell
                slot={slot}
                onClick={() => {
                  if (slot) {
                    setSelectedInventoryRef({
                      kind: "item",
                      idx,
                    });
                  }
                }}
              />
              {idx % INVENTORY_COLS === INVENTORY_COLS - 1 && (
                <div className={styles["break"]} />
              )}
            </React.Fragment>
          ))}
        </div>
        <h2>Hotbar</h2>
        <div className={styles["admin-inventory"]}>
          {(playerEntity?.inventory?.hotbar ?? []).map((slot, idx) => (
            <AdminInventoryCell
              slot={slot}
              key={`slot-${idx}`}
              onClick={() => {
                if (slot) {
                  setSelectedInventoryRef({
                    kind: "hotbar",
                    idx,
                  });
                }
              }}
            />
          ))}
        </div>
        <h2>Wearables</h2>
        <div className={styles["admin-inventory"]}>
          {playerEntity?.wearing?.items &&
            mapMap(playerEntity.wearing.items, (slot, key) => (
              <AdminInventoryCell
                key={`wear-${key}`}
                slot={{ item: slot, count: 1n }}
                onClick={() => {
                  if (slot) {
                    setSelectedInventoryRef({
                      kind: "wearable",
                      key,
                    });
                  }
                }}
              />
            ))}
        </div>
        <div className="flex gap-1">
          <DialogButton
            extraClassNames="btn-inline"
            onClick={() => {
              if (selectedInventoryRef) {
                void removeFromInventory(selectedInventoryRef);
              }
            }}
            disabled={!selectedInventoryRef || inventoryChanging}
          >
            {inventoryChanging ? (
              "Modifying"
            ) : (
              <>Remove {JSON.stringify(selectedInventoryRef)} From Inventory</>
            )}
          </DialogButton>
          <DialogButton
            extraClassNames="btn-inline"
            onClick={() => {
              confirm("Are you sure you want to reset inventory?") &&
                void resetInventory();
            }}
            disabled={inventoryChanging}
          >
            {inventoryChanging ? "Modifying" : <>Clear Inventory</>}
          </DialogButton>
        </div>
      </li>
      <li>
        <h2> Inventory Overflow </h2>
        {playerEntity && <InventoryOverflowSection user={playerEntity} />}
      </li>
      <li>
        <h2> Challenges </h2>
        {playerEntity && <ChallengesSection user={playerEntity} />}
      </li>
      <li>
        <h2>Reset</h2>
        <DialogButton
          extraClassNames="btn-inline"
          onClick={() => {
            confirm("Are you sure you want to reset this player?") &&
              void resetPlayer();
          }}
          disabled={resettingPlayer}
        >
          Reset Player
        </DialogButton>
      </li>
    </ul>
  );
};

export const AdminUserPage: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ user, sessionCount: initialSessionCount, canLoginWith }) => {
  if (!user) {
    return (
      <AdminPage>
        <div className="error">User not found!</div>{" "}
      </AdminPage>
    );
  }

  const router = useRouter();
  const [error, setError] = useError();
  const [sessionCount, setSessionCount] = useState(initialSessionCount);
  const [userDisabled, setUserDisabled] = useState(user.disabled);
  const entityOrError = useEntityAdmin(user.id);

  const changeRole = useCallback(async (role: SpecialRoles, isAdd: boolean) => {
    const isConfirmed = confirm(
      `${isAdd ? "Add" : "Remove"} role ${role} for ${user.id}?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      await jsonPost<void, ChangeRoleRequest>("/api/admin/change_role", {
        role,
        userId: user.id,
        isAdd,
      });
      router.reload();
    } catch (error: any) {
      setError(error);
    } finally {
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await jsonPost<void, LogoutRequest>("/api/admin/logout", {
        userId: user.id,
      });
      setSessionCount(0);
    } catch (error: any) {
      setError(error);
    }
  }, []);

  const blockUser = useCallback(async (isDisable: boolean) => {
    try {
      await jsonPost<void, DisableRequest>("/api/admin/disable", {
        userId: user.id,
        isDisable,
      });
      setUserDisabled(isDisable);
    } catch (error: any) {
      setError(error);
    }
  }, []);

  const bikkieLoaded = useBikkieLoaded();

  const anyError =
    error ?? (entityOrError.kind === "error" ? entityOrError.error : undefined);
  const { version, entity } =
    entityOrError.kind === "success"
      ? entityOrError.result
      : { version: undefined, entity: undefined };

  return (
    <AdminPage>
      <div className="m-auto max-w-[50%] py-4">
        <AdminUserTitle
          user={user}
          extraTitle={`ECS@${version} Registered: ${
            user.createMs ? new Date(user.createMs) : "unknown"
          }`}
        />
        <MaybeError error={anyError} />
        <div className={styles["section"]}>
          Active Sessions: {sessionCount}{" "}
          <div className="flex gap-1">
            {sessionCount > 0 && (
              <DialogButton
                extraClassNames="btn-inline"
                onClick={() => {
                  confirm("Are you sure you want to logout this player?") &&
                    void logout();
                }}
              >
                Log Out
              </DialogButton>
            )}
            {userDisabled ? (
              <DialogButton
                extraClassNames="btn-inline"
                onClick={() => {
                  confirm("Are you sure you want to disable this player?") &&
                    void blockUser(false);
                }}
              >
                Enable User
              </DialogButton>
            ) : (
              <DialogButton
                extraClassNames="btn-inline"
                onClick={() => {
                  confirm("Are you sure you want to disable this player?") &&
                    void blockUser(true);
                }}
              >
                Disable User
              </DialogButton>
            )}
          </div>
        </div>
        <div className={styles["section"]}>
          Can login using:
          <ul className={styles["admin-page-list"]}>
            {canLoginWith.map((link) => (
              <li key={link}>{link}</li>
            ))}
          </ul>
        </div>
        <div>
          <ul>
            <li>
              <a
                target="_blank"
                href={googleErrorConsoleURL(user.id)}
                rel="noreferrer"
              >
                Google Cloud Error Log
              </a>
            </li>
            <li>
              <Link href={`/admin/sync?filter=${user.id}`}>
                Sync Information
              </Link>
            </li>
            <li>
              <Link href={`/admin/user/${user.username || user.id}/cvals`}>
                Cvals
              </Link>
            </li>
            <li>
              <Link href={`/admin/user/${user.username || user.id}/groups`}>
                Groups
              </Link>
            </li>
          </ul>
        </div>
        <ul className={styles["admin-page-list"]}>
          <li>
            Roles:
            <div className="flex gap-1 py-1">
              {Array.from([...(entity?.user_roles?.roles || new Set())])
                .sort()
                .map((role, i) => (
                  <Tooltipped key={i} tooltip="Click to remove">
                    <div
                      className="bg-white/10 px-0.4 py-0.2"
                      onClick={() => {
                        void changeRole(role, false);
                      }}
                    >
                      {role}
                    </div>
                  </Tooltipped>
                ))}
            </div>
            <div>
              <select
                onChange={(e) => {
                  if (e.target.value !== "") {
                    void changeRole(e.target.value as SpecialRoles, true);
                  }
                }}
              >
                <option selected>Add role...</option>
                {Array.from(ALL_SPECIAL_ROLES)
                  .filter((role) => !entity?.user_roles?.roles.has(role))
                  .sort()
                  .map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
              </select>
            </div>
          </li>
        </ul>
        {entity && bikkieLoaded && (
          <AdminEditPlayerEntity playerEntity={entity} />
        )}
        <ul className={styles["admin-page-list"]}>
          <li>
            <h2> Firestore data </h2>
            <AdminReactJSON src={user} collapsed />
          </li>
          <li>
            <h2> Game data </h2>
            <Link href={`/admin/ecs/${user.id}`}>Edit game data (ECS)</Link>
            <AdminReactJSON src={entity ?? {}} collapsed />
          </li>
        </ul>
      </div>
    </AdminPage>
  );
};

export default AdminUserPage;

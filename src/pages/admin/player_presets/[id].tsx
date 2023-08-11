import { AdminPage } from "@/client/components/admin/AdminPage";
import { AdminReactJSON } from "@/client/components/admin/AdminReactJSON";
import { useBikkieLoaded } from "@/client/components/hooks/client_hooks";
import styles from "@/client/styles/admin.player_presets.module.css";
import { useAwaited } from "@/client/util/hooks";
import { AdminEditPlayerEntity } from "@/pages/admin/user/[id]";
import type {
  DeletePlayerPresetRequest,
  DeletePlayerPresetResponse,
} from "@/pages/api/admin/player_presets/delete";
import type {
  EditPlayerPresetRequest,
  EditPlayerPresetResponse,
} from "@/pages/api/admin/player_presets/edit";
import type {
  LoadPresetRequest,
  LoadPresetResponse,
} from "@/pages/api/admin/player_presets/load";
import type { PlaytestPresetRequest } from "@/pages/api/admin/player_presets/playtest";
import type {
  SavePresetRequest,
  SavePresetResponse,
} from "@/pages/api/admin/player_presets/save";
import { okOrAPIError } from "@/server/web/errors";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { isAPIErrorCode } from "@/shared/api/errors";
import { secondsSinceEpochToDate } from "@/shared/ecs/config";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, zBiomesId } from "@/shared/ids";
import type {
  ResolveUsernameResponse,
  UserInfoBundle,
} from "@/shared/util/fetch_bundles";
import {
  jsonFetch,
  jsonPost,
  jsonPostAnyResponse,
} from "@/shared/util/fetch_helpers";
import { pathWithQuery } from "@/shared/util/helpers";
import { throttle, trim } from "lodash";
import type { InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import spinnerIcon from "/public/hud/spinner.gif";
import failedIcon from "/public/hud/status-failed.png";
import successIcon from "/public/hud/status-success.png";

export const zPlayerPresetById = z.object({
  id: z.union([zBiomesId, z.string()]),
});

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: zPlayerPresetById,
  },
  async ({ context: { worldApi }, query: { id: idOrStr } }) => {
    const id = zBiomesId.parse(
      typeof idOrStr === "string" ? parseInt(idOrStr) : idOrStr
    );
    okOrAPIError(id !== INVALID_BIOMES_ID, "not_found");
    const entity = await worldApi.get(id);
    okOrAPIError(entity?.hasPresetPrototype(), "not_found");
    return {
      props: {
        serializedEntity: JSON.stringify(
          EntitySerde.serialize(SerializeForServer, entity.materialize())
        ),
      },
    };
  }
);

// Probably shareable. Client version would use socialManager though.
const PlayerSelector: React.FunctionComponent<{
  onSelect?: (id: BiomesId | undefined) => void;
}> = ({ onSelect }) => {
  const [search, setSearch] = React.useState("");
  const [match, setMatch] = React.useState<UserInfoBundle | undefined>();
  const [loading, setLoading] = React.useState(false);
  const throttledMatch = useCallback(
    throttle(
      (search: string, fn: (match: UserInfoBundle | undefined) => void) =>
        void (async () => {
          if (search.length === 0) {
            return fn(undefined);
          }
          try {
            const match = await jsonFetch<ResolveUsernameResponse>(
              pathWithQuery("/api/social/resolve_username", {
                username: search,
              })
            );
            fn(match);
          } catch (e) {
            if (isAPIErrorCode("not_found", e)) {
              fn(undefined);
              return;
            }
            throw e;
          }
        })(),
      1000
    ),
    []
  );
  useEffect(() => {
    let needsUpdate = true;
    if (search.length === 0) {
      return;
    }
    setLoading(true);
    throttledMatch(search, (match) => {
      if (needsUpdate) {
        setMatch(match);
        setLoading(false);
        onSelect?.(match?.user.id);
      }
    });
    return () => {
      needsUpdate = false;
    };
  }, [search, throttledMatch, onSelect]);
  return (
    <div className={styles["player-selector"]}>
      <input onChange={(e) => setSearch(trim(e.target.value))} />
      {loading ? (
        <img src={spinnerIcon.src} />
      ) : match ? (
        <img src={successIcon.src} />
      ) : (
        <img src={failedIcon.src} />
      )}
    </div>
  );
};

export const PresetDetail: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ serializedEntity }) => {
  const entity = serializedEntity
    ? EntitySerde.deserialize(JSON.parse(serializedEntity), false)
    : null;
  const bikkieLoaded = useBikkieLoaded();
  const [targetPlayer, setTargetPlayer] = useState<BiomesId | undefined>();
  const [name, setName] = useState(entity?.label?.text ?? "");
  const [emails, setEmails] = useState("");
  const [appendUnique, setAppendUnique] = useState(true);
  const [expirePlaytest, setExpirePlaytest] = useState(true);
  const [saveDataResponse, setSaveDataResponse] = useState<
    "saving" | "failed" | undefined
  >();
  const [transactingPlayer, setTransactingPlayer] = useState(false);
  const [startingPlaytest, setStartingPlaytest] = useState(false);
  const lastUpdatedBy = useAwaited(
    jsonFetch<UserInfoBundle>(
      pathWithQuery("/api/social/user_info", {
        userId: entity?.preset_prototype?.last_updated_by,
      })
    ).catch(() => undefined),
    undefined,
    undefined,
    [entity?.preset_prototype?.last_updated_by]
  );
  const router = useRouter();
  const updatePresetData = useCallback(() => {
    void (async () => {
      if (!entity?.id) {
        return;
      }
      setSaveDataResponse("saving");
      const res = await jsonPost<
        EditPlayerPresetResponse,
        EditPlayerPresetRequest
      >("/api/admin/player_presets/edit", {
        id: entity.id,
        name,
      });
      if (res) {
        setSaveDataResponse(undefined);
        router.reload();
      } else {
        setSaveDataResponse("failed");
      }
    })();
  }, [entity?.id, name, setSaveDataResponse, router]);

  const startPlaytest = useCallback(() => {
    void (async () => {
      if (!emails || !entity?.id) {
        return;
      }
      setStartingPlaytest(true);
      let emailArr = emails.split(",").map((e) => e.trim());
      if (appendUnique) {
        const uniqueStr = Date.now().toString();
        emailArr = emailArr.map((e) => {
          const atIdx = e.indexOf("@");
          if (atIdx === -1) {
            return e;
          }
          return `${e.substring(0, atIdx)}+biomespt-${uniqueStr}${e.substring(
            atIdx
          )}`;
        });
      }
      await jsonPostAnyResponse<PlaytestPresetRequest>(
        "/api/admin/player_presets/playtest",
        {
          preset: entity.id,
          emails: emailArr,
          expire: expirePlaytest,
        }
      );
      setStartingPlaytest(false);
      alert("Emails sent!");
      router.reload();
    })();
  }, [entity?.id, emails]);

  const deletePreset = useCallback(() => {
    void (async () => {
      if (!entity?.id) {
        return;
      }

      await jsonPost<DeletePlayerPresetResponse, DeletePlayerPresetRequest>(
        "/api/admin/player_presets/delete",
        {
          id: entity.id,
        }
      );
      await router.push("/admin/player_presets");
    })();
  }, [entity?.id]);

  const setFromPlayer = useCallback(() => {
    void (async () => {
      if (!targetPlayer || !entity?.id) {
        return;
      }
      setTransactingPlayer(true);
      await jsonPost<SavePresetResponse, SavePresetRequest>(
        "/api/admin/player_presets/save",
        {
          preset: entity.id,
          playerId: targetPlayer,
        }
      );
      setTransactingPlayer(false);
      router.reload();
    })();
  }, [entity?.id, router, targetPlayer, setTransactingPlayer]);
  const applyToPlayer = useCallback(() => {
    void (async () => {
      if (!targetPlayer || !entity?.id) {
        return;
      }
      setTransactingPlayer(true);
      await jsonPost<LoadPresetResponse, LoadPresetRequest>(
        "/api/admin/player_presets/load",
        {
          preset: entity?.id,
          playerId: targetPlayer,
        }
      );
      setTransactingPlayer(false);
    })();
  }, [entity?.id, targetPlayer, setTransactingPlayer]);
  const hasDataEdit = useMemo(
    () => entity?.label?.text !== name,
    [entity?.label?.text, name]
  );
  return (
    <AdminPage>
      <ul className={styles["player-preset-data"]}>
        <li>
          <label>Preset Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </li>
        <li>
          <button disabled={!hasDataEdit} onClick={updatePresetData}>
            Save
          </button>
        </li>
        {saveDataResponse === "saving" ? (
          <li>
            <img src={spinnerIcon.src} />
          </li>
        ) : saveDataResponse === "failed" ? (
          <li>
            <img src={failedIcon.src} alt="Save failed. Name collision?" />
            Name exists
          </li>
        ) : null}
        <li>
          <button className={styles["delete"]} onClick={deletePreset}>
            Delete
          </button>
        </li>
      </ul>
      <div className={styles["playtest-actions"]}>
        <label>Playtest (comma-delimited)</label>
        <input
          value={emails}
          placeholder="emails"
          onChange={(e) => setEmails(e.target.value)}
        />
        <button disabled={!emails || startingPlaytest} onClick={startPlaytest}>
          Start Playtest
        </button>
        <label>
          Append Unique (appends time to email to force new accounts)
        </label>
        <input
          type="checkbox"
          checked={appendUnique}
          onChange={(e) => setAppendUnique(e.target.checked)}
        />
        <label>Expire after 1 week</label>
        <input
          type="checkbox"
          checked={expirePlaytest}
          onChange={(e) => setExpirePlaytest(e.target.checked)}
        />
        {startingPlaytest && (
          <img src={spinnerIcon.src} className={styles["transacting"]} />
        )}
      </div>
      <div className={styles["player-actions"]}>
        <label>Player</label>
        <PlayerSelector
          onSelect={(id) => {
            setTargetPlayer(id);
          }}
        />
        <div className={styles["player-action-buttons"]}>
          <button disabled={!targetPlayer} onClick={setFromPlayer}>
            Set From Player
          </button>
          <button disabled={!targetPlayer} onClick={applyToPlayer}>
            Apply To Player
          </button>
          {transactingPlayer && (
            <img src={spinnerIcon.src} className={styles["transacting"]} />
          )}
        </div>
      </div>
      {entity && bikkieLoaded && (
        <>
          <ul className={styles["player-preset-data"]}>
            <li>
              <label>Last Updated</label>
              {entity.preset_prototype?.last_updated &&
                secondsSinceEpochToDate(
                  entity.preset_prototype.last_updated
                ).toLocaleString()}{" "}
              by {lastUpdatedBy?.user.username ?? "Unknown"}
            </li>
          </ul>
          <AdminEditPlayerEntity playerEntity={entity} />
          <AdminReactJSON src={entity} collapsed />
        </>
      )}
    </AdminPage>
  );
};
export default PresetDetail;

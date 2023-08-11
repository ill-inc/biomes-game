import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { GraphicsSettings } from "@/client/components/GraphicsSettings";
import { LanguageSelector } from "@/client/components/inventory/LanguageSelector";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import { DialogSlider } from "@/client/components/system/DialogSlider";
import { LazyFragment } from "@/client/components/system/LazyFragment";
import {
  LeftPaneDrilldown,
  LeftPaneDrilldownItem,
} from "@/client/components/system/LeftPaneDrilldown";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import { useTypedStorageItem } from "@/client/util/typed_local_storage";
import type { ProgressQuestsRequest } from "@/pages/api/admin/quests/progress";
import type { ResetQuestsRequest } from "@/pages/api/admin/quests/reset";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { sortBy } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";

const pages = ["Game", "AdminNUX", "AdminChallenge", "Help"] as const;
export type SettingsPage = (typeof pages)[number];

export const defaultMouseSensitivity = 50;
export const defaultVirtualJoystickSensitivity = 200;
export const defaultTouchscreenSensitivity = 200;

export const AdminNUXPage: React.FunctionComponent<{}> = ({}) => {
  const { nuxManager } = useClientContext();
  const [_, setRerender] = useState(0);
  return (
    <div className="nux-settings">
      <ul>
        {nuxManager.nuxWithStates().map(([machineId, machineState]) => (
          <li key={machineId} className="nux-setting-item">
            <div className="left-column">
              {machineId}
              {` · `}
              State:{` `}
              {machineState === "complete" ? "complete" : machineState.id}
            </div>
            <div className="horizontal-buttons">
              <DialogButton
                size="small"
                onClick={() => {
                  nuxManager.resetNUX(machineId, "start");
                  setRerender(Math.random());
                }}
              >
                Start
              </DialogButton>
              <DialogButton
                size="small"
                onClick={() => {
                  nuxManager.resetNUX(machineId, "debug");
                  setRerender(Math.random());
                }}
              >
                Debug
              </DialogButton>
              <DialogButton
                size="small"
                onClick={() => {
                  nuxManager.resetNUX(machineId, "complete");
                  setRerender(Math.random());
                }}
              >
                Complete
              </DialogButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AdminQuestRow: React.FunctionComponent<{
  id: BiomesId;
  disabled?: boolean;
}> = ({ id, disabled }) => {
  const { userId, reactResources } = useClientContext();
  const state = reactResources.useResolved("/quest", id);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const quest = anItem(id);

  if (!quest || !quest.isQuest) {
    return <li>Unknown quest</li>;
  }
  return (
    <li className="nux-setting-item">
      <div className="left-column">
        {quest.displayName}
        <br />
        <label>{state?.state ?? "none"}</label>
      </div>
      <div className="horizontal-buttons">
        <DialogButton
          disabled={disabled || isPerformingAction}
          size="xsmall"
          onClick={() => {
            setIsPerformingAction(true);
            void jsonPost<void, ResetQuestsRequest>("/api/admin/quests/reset", {
              userId,
              challengeStateMap: {
                [id]: "start",
              },
            }).finally(() => {
              setIsPerformingAction(false);
            });
          }}
        >
          Locked
        </DialogButton>
        <DialogButton
          size="xsmall"
          disabled={disabled || isPerformingAction}
          onClick={() => {
            void jsonPost<void, ResetQuestsRequest>("/api/admin/quests/reset", {
              userId,
              challengeStateMap: {
                [id]: "available",
              },
            }).finally(() => {
              setIsPerformingAction(false);
            });
          }}
        >
          Available
        </DialogButton>
        <DialogButton
          size="xsmall"
          disabled={disabled || isPerformingAction}
          onClick={() => {
            void jsonPost<void, ProgressQuestsRequest>(
              "/api/admin/quests/progress",
              {
                userId,
                questId: id,
              }
            ).finally(() => {
              setIsPerformingAction(false);
            });
          }}
        >
          Progress
        </DialogButton>
        <DialogButton
          size="xsmall"
          disabled={disabled || isPerformingAction}
          onClick={() => {
            void jsonPost<void, ResetQuestsRequest>("/api/admin/quests/reset", {
              userId,
              challengeStateMap: {
                [id]: "completed",
              },
            }).finally(() => {
              setIsPerformingAction(false);
            });
          }}
        >
          Complete
        </DialogButton>
      </div>
    </li>
  );
};

export const AdminChallengePage: React.FunctionComponent<{}> = ({}) => {
  const { userId } = useClientContext();
  const [filter, setFilter] = useState("");
  const [locking, setLocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef?.current?.focus();
  }, []);

  const sortedQuests = useMemo(() => {
    return sortBy(
      BikkieRuntime.get().getBiscuits(bikkie.schema.quests),
      (e) => e.displayName
    );
  }, [BikkieRuntime.get().epoch]);

  return (
    <div className="nux-settings">
      <div className="filters">
        <input
          type="text"
          placeholder="Filter"
          ref={inputRef}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFilter(e.target.value);
          }}
        />
        <div className="buttons">
          <DialogButton
            disabled={locking}
            onClick={() => {
              setLocking(true);
              void jsonPost<void, ResetQuestsRequest>(
                "/api/admin/quests/reset",
                {
                  userId,
                  challengeStateMap: {},
                  resetAll: true,
                }
              ).finally(() => setLocking(false));
            }}
          >
            {locking ? "Locking..." : "Lock All"}
          </DialogButton>
        </div>
      </div>
      <ul>
        {sortedQuests.map((q) => (
          <React.Fragment key={q.id}>
            {filter && !q.displayName.toLowerCase().includes(filter) ? (
              <></>
            ) : (
              <AdminQuestRow id={q.id} key={q.id} disabled={locking} />
            )}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
};

export const HelpPage: React.FunctionComponent<{}> = ({}) => {
  const [togglePrimary] = useTypedStorageItem(
    "settings.mouse.togglePrimaryClick",
    false
  );
  const primaryAction = "Use";
  const secondaryAction = "Destroy";

  return (
    <>
      <label>Mouse Controls</label>
      <table className="mb-2 table-fixed">
        <tr>
          <td className="w-20">Primary Click</td>
          <td> {togglePrimary ? secondaryAction : primaryAction} </td>
        </tr>
        <tr>
          <td>Secondary Click</td>
          <td> {togglePrimary ? primaryAction : secondaryAction} </td>
        </tr>
      </table>
      <label>Keyboard Controls</label>
      <table className="mb-2 table-fixed">
        <tr>
          <td className="w-20">[WASD]</td>
          <td>Walk</td>
        </tr>
        <tr>
          <td>[Space]</td>
          <td>Jump</td>
        </tr>
        <tr>
          <td>[Z]</td>
          <td>Crouch</td>
        </tr>
        <tr>
          <td>[Shift]</td>
          <td>Run</td>
        </tr>
        <tr>
          <td>[1-8]</td>
          <td>Equip</td>
        </tr>
        <tr>
          <td>[Q]</td>
          <td>Quests</td>
        </tr>
        <tr>
          <td>[T]</td>
          <td>Toggle Camera View</td>
        </tr>
        <tr>
          <td>[Esc]</td>
          <td>Unlock Cursor</td>
        </tr>
        <tr>
          <td>[E] or [I]</td>
          <td>Inventory</td>
        </tr>
        <tr>
          <td>[R]</td>
          <td>Crafting</td>
        </tr>

        <tr>
          <td>[V]</td>
          <td>Notifications</td>
        </tr>
        <tr>
          <td>[.]</td>
          <td>Hide Game UI</td>
        </tr>
      </table>
    </>
  );
};

export const GamePage: React.FunctionComponent<{
  seeAdvancedOptions: boolean;
}> = ({ seeAdvancedOptions }) => {
  const { reactResources, audioManager } = useClientContext();
  const tweaks = reactResources.use("/tweaks");

  const [effectsVolume, setEffectsVolume] = useTypedStorageItem(
    "settings.volume.effects",
    0
  );
  const [musicVolume, setMusicVolume] = useTypedStorageItem(
    "settings.volume.music",
    0
  );
  const [mediaVolume, setMediaVolume] = useTypedStorageItem(
    "settings.volume.media",
    0
  );
  const [voiceVolume, setVoiceVolume] = useTypedStorageItem(
    "settings.volume.voice",
    0
  );

  const [togglePrimary, setTogglePrimary] = useTypedStorageItem(
    "settings.mouse.togglePrimaryClick",
    false
  );

  const [invertY, setInvertY] = useTypedStorageItem(
    "settings.mouse.invertY",
    false
  );

  const [keyboardToggleRunSwim, setKeyboardToggleRunSwim] = useTypedStorageItem(
    "settings.keyboard.toggleRunSwimBool",
    false
  );
  const [keyboardToggleCrouch, setKeyboardToggleCrouch] = useTypedStorageItem(
    "settings.keyboard.toggleCrouchBool",
    false
  );

  const [scrollHotbar, setScrollHotbar] = useTypedStorageItem(
    "settings.mouse.scrollHotbar",
    false
  );

  const [hideReturnToGame, setHideReturnToGame] = useTypedStorageItem(
    "settings.hud.hideReturnToGame",
    false
  );

  const [keepOverlaysVisible, setKeepOverlaysVisible] = useTypedStorageItem(
    "settings.hud.keepOverlaysVisible",
    false
  );
  const [showPerformanceHUD, setShowPerformanceHUD] = useTypedStorageItem(
    "settings.hud.showPerformance",
    true
  );

  const [cinematicCamera, setCinematicCamera] = useTypedStorageItem(
    "settings.cam.cinematicMode",
    false
  );

  const [mouseSensitivity, setMouseSensitivity] = useTypedStorageItem(
    "settings.mouse.sensitivity",
    defaultMouseSensitivity
  );

  const [printResolutionCamera, setPrintResolutionCamera] = useTypedStorageItem(
    "settings.cam.printResolution",
    false
  );

  return (
    <>
      <SettingsSection
        title="Graphics and Performance"
        flair={
          <div
            className="graphics-preview-button"
            onClick={() =>
              reactResources.set("/game_modal", {
                kind: "graphics_preview",
                lastModal: {
                  kind: "generic_miniphone",
                  rootPayload: {
                    type: "game_settings",
                    page: "Game",
                  },
                },
              })
            }
          >
            Preview
          </div>
        }
      >
        <DialogCheckbox
          label="Show Performance Stats"
          checked={showPerformanceHUD}
          onCheck={() => {
            setShowPerformanceHUD(!showPerformanceHUD);
          }}
        />
        <GraphicsSettings />
      </SettingsSection>
      <SettingsSection title="Sound Settings">
        <div className="dialog-button-group">
          <DialogSlider
            min={0}
            max={100}
            value={effectsVolume}
            onChange={setEffectsVolume}
          >
            Sound Effects Volume
          </DialogSlider>
          <DialogSlider
            min={0}
            max={100}
            value={musicVolume}
            onChange={(val) => {
              setMusicVolume(val);
              audioManager.updateBackgroundMusicVolume();
            }}
          >
            Music Volume
          </DialogSlider>
          <DialogSlider
            min={0}
            max={100}
            value={mediaVolume}
            onChange={setMediaVolume}
          >
            Media Player Volume
          </DialogSlider>
          <DialogSlider
            min={0}
            max={100}
            value={voiceVolume}
            onChange={setVoiceVolume}
          >
            Voices Volume
          </DialogSlider>
        </div>
      </SettingsSection>

      {tweaks.chatTranslation && (
        <SettingsSection title="Language Settings">
          <div className="dialog-button-group">
            <div className="label">Language</div>
            <LanguageSelector />
          </div>
        </SettingsSection>
      )}
      <SettingsSection title="Keyboard and Mouse Settings">
        <div className="keyboard-controls">
          <div className="dialog-button-group">
            <DialogSlider
              min={0}
              max={100}
              value={mouseSensitivity}
              onChange={(v) => {
                setMouseSensitivity(v);
              }}
            >
              Mouse Sensitivity
            </DialogSlider>
            <DialogCheckbox
              label="Swap Primary and Secondary Click"
              checked={togglePrimary}
              onCheck={() => {
                setTogglePrimary(!togglePrimary);
              }}
            />

            <DialogCheckbox
              label="Invert Y"
              checked={invertY}
              onCheck={() => {
                setInvertY(!invertY);
              }}
            />

            <DialogCheckbox
              label="Tap to Toggle Run/Swim"
              checked={keyboardToggleRunSwim}
              onCheck={() => {
                setKeyboardToggleRunSwim(!keyboardToggleRunSwim);
              }}
            />

            <DialogCheckbox
              label="Tap to Toggle Crouch"
              checked={keyboardToggleCrouch}
              onCheck={() => {
                setKeyboardToggleCrouch(!keyboardToggleCrouch);
              }}
            />

            <DialogCheckbox
              label="Scroll to Switch Hotbar Selection"
              checked={scrollHotbar}
              onCheck={() => {
                setScrollHotbar(!scrollHotbar);
              }}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Misc. Settings">
        <div className="dialog-button-group">
          <DialogCheckbox
            label="Hide Return to Game Button"
            checked={hideReturnToGame}
            onCheck={() => {
              setHideReturnToGame(!hideReturnToGame);
            }}
          />

          <DialogCheckbox
            label="Print Resolution Camera"
            checked={printResolutionCamera}
            onCheck={() => {
              setPrintResolutionCamera(!printResolutionCamera);
            }}
          />
        </div>
      </SettingsSection>

      {seeAdvancedOptions && (
        <SettingsSection title="Admin">
          <div className="dialog-button-group">
            <DialogCheckbox
              label="Keep Overlays Visible on Escape"
              checked={keepOverlaysVisible}
              onCheck={() => {
                setKeepOverlaysVisible(!keepOverlaysVisible);
              }}
            />

            <DialogCheckbox
              label="Enable Cinematic Camera"
              checked={cinematicCamera}
              onCheck={() => {
                setCinematicCamera(!cinematicCamera);
              }}
            />
          </div>
        </SettingsSection>
      )}
    </>
  );
};

const SettingsSection: React.FunctionComponent<
  PropsWithChildren<{
    title: string;
    flair?: JSX.Element;
  }>
> = ({ title, flair, children }) => {
  return (
    <div className="settings-section">
      <div className="settings-section-title">
        {title}
        {flair}
      </div>
      <div className="settings-section-content">{children}</div>
    </div>
  );
};

export const GameSettingsScreen: React.FunctionComponent<{
  page?: SettingsPage;
}> = ({ page: initialPage }) => {
  const { authManager, clientConfig } = useClientContext();
  const [error, _setError] = useError();
  const [page, setPage] = useState<SettingsPage>(initialPage || "Game");

  const seeAdvancedOptions =
    authManager.currentUser.hasSpecialRole("advancedOptions") ||
    clientConfig.dev;

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title="Options" />
      <LeftPane>
        <LeftPaneDrilldown>
          <LeftPaneDrilldownItem
            title="Game"
            onClick={() => setPage("Game")}
            selected={page === "Game"}
          />

          {seeAdvancedOptions && (
            <>
              <LeftPaneDrilldownItem
                title="NUX (Admin)"
                onClick={() => setPage("AdminNUX")}
                selected={page === "AdminNUX"}
              />
              <LeftPaneDrilldownItem
                title="Challenges (Admin)"
                onClick={() => setPage("AdminChallenge")}
                selected={page === "AdminChallenge"}
              />
            </>
          )}

          <LeftPaneDrilldownItem
            title="Help"
            onClick={() => setPage("Help")}
            selected={page === "Help"}
          />
        </LeftPaneDrilldown>
      </LeftPane>
      <RightPane>
        <div className="right-extra-padded-view">
          <MaybeError error={error} />

          <LazyFragment isActive={page === "Game"}>
            <GamePage seeAdvancedOptions={seeAdvancedOptions} />
          </LazyFragment>
          {seeAdvancedOptions && (
            <>
              <LazyFragment isActive={page === "AdminNUX"}>
                <AdminNUXPage />
              </LazyFragment>
              <LazyFragment isActive={page === "AdminChallenge"}>
                <AdminChallengePage />
              </LazyFragment>
            </>
          )}
          <LazyFragment isActive={page === "Help"}>
            <HelpPage />
          </LazyFragment>
        </div>
      </RightPane>
    </SplitPaneScreen>
  );
};

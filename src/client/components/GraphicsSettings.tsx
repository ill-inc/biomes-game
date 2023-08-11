import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { FPSCounter } from "@/client/components/FPSCounter";
import { DialogButton } from "@/client/components/system/DialogButton";
import { DialogCheckbox } from "@/client/components/system/DialogCheckbox";
import type { GameModal } from "@/client/game/resources/game_modal";
import type {
  DrawDistance,
  EntityDrawLimit,
  GraphicsQuality,
  PostprocessDebug,
} from "@/client/util/typed_local_storage";
import {
  useTypedStorageItem,
  zDrawDistance,
  zEntityDrawLimit,
  zGraphicsQuality,
  zPostprocessDebug,
} from "@/client/util/typed_local_storage";
import { log } from "@/shared/logging";
import { assertNever } from "@/shared/util/type_helpers";
import { motion } from "framer-motion";
import { startCase } from "lodash";
import { useCallback, useMemo, useState } from "react";

const RenderScaleSetting: React.FunctionComponent<{ disabled?: boolean }> = ({
  disabled,
}) => {
  const { reactResources } = useClientContext();
  const [_, setRenderScale] = useTypedStorageItem(
    "settings.graphics.renderScale",
    { kind: "native" }
  );
  const resolvedSettings = reactResources.use("/settings/graphics/resolved");
  const dynamicSettings = reactResources.use("/settings/graphics/dynamic");
  const [renderScaleValue, renderScaleOptions] = useMemo(() => {
    const presetRes = [
      [3840, 2160],
      [2560, 1440],
      [1920, 1080],
      [1280, 720],
      [854, 480],
    ];
    const presetScale = [0.9, 0.8, 0.7, 0.6, 0.5];
    const options: JSX.Element[] = [];
    const pushOption = (value: string, label: string) => {
      options.push(
        <option key={value} value={value}>
          {label}
        </option>
      );
    };

    let renderScaleValue: string = "";
    if (resolvedSettings.renderScale.kind === "native") {
      renderScaleValue = "native";
    } else if (resolvedSettings.renderScale.kind === "retina") {
      renderScaleValue = "retina";
    } else if (resolvedSettings.renderScale.kind === "dynamic") {
      renderScaleValue = "dynamic";
    } else if (resolvedSettings.renderScale.kind === "resolution") {
      const [width, height] = resolvedSettings.renderScale.res;
      const index = presetRes.findIndex(
        ([w, h]) => w === width && h === height
      );
      renderScaleValue = `res-${width}-${height}`;
      if (index === -1) {
        pushOption(`res-${width}-${height}`, `${width}x${height}`);
      }
    } else if (resolvedSettings.renderScale.kind === "scale") {
      renderScaleValue = `scale-${resolvedSettings.renderScale.scale}`;
      const scale = resolvedSettings.renderScale.scale;
      const index = presetScale.findIndex((s) => s === scale);
      if (index === -1) {
        pushOption(
          `scale-${resolvedSettings.renderScale.scale}`,
          `${Math.round(scale * 100)}%`
        );
      }
    } else {
      assertNever(resolvedSettings.renderScale);
    }

    if (resolvedSettings.renderScale.kind === "dynamic") {
      pushOption(
        "dynamic",
        `Dynamic (${Math.round(dynamicSettings.renderScale * 100)}%)`
      );
    } else {
      pushOption("dynamic", "Dynamic");
    }

    pushOption("native", "Native");
    if (window.devicePixelRatio > 1) {
      pushOption("retina", "Retina");
    }
    for (const [width, height] of presetRes) {
      pushOption(`res-${width}-${height}`, `${width}x${height}`);
    }
    for (const scale of presetScale) {
      pushOption(`scale-${scale}`, `${scale * 100}%`);
    }
    return [renderScaleValue, options];
  }, [resolvedSettings.renderScale, dynamicSettings.renderScale]);
  const setRenderScaleFromString = useCallback(
    (value: string) => {
      if (value === "native") {
        setRenderScale({ kind: "native" });
      } else if (value === "retina") {
        setRenderScale({ kind: "retina" });
      } else if (value === "dynamic") {
        setRenderScale({ kind: "dynamic" });
      } else if (value.startsWith("res-")) {
        const [_, width, height] = value.split("-");
        setRenderScale({
          kind: "resolution",
          res: [parseInt(width), parseInt(height)],
        });
      } else if (value.startsWith("scale-")) {
        const [_, scale] = value.split("-");
        setRenderScale({ kind: "scale", scale: parseFloat(scale) });
      } else {
        log.error(`Invalid render scale value: ${value}`);
      }
    },
    [setRenderScale]
  );

  return (
    <select
      name="render-scale"
      value={renderScaleValue}
      onChange={(e) => setRenderScaleFromString(e.target.value)}
      disabled={disabled}
    >
      {renderScaleOptions}
    </select>
  );
};

export const GraphicsSettings: React.FunctionComponent<{
  alwaysShowDetails?: boolean;
}> = ({ alwaysShowDetails }) => {
  const { authManager, clientConfig, reactResources } = useClientContext();
  const showDevOptions =
    authManager.currentUser.hasSpecialRole("advancedOptions") ||
    clientConfig.dev;

  const [quality, setQuality] = useTypedStorageItem(
    "settings.graphics.quality",
    "auto"
  );

  const [antiAliasing, setAntiAliasing] = useTypedStorageItem(
    "settings.graphics.postprocessing.aa",
    "none"
  );

  const [ssao, setSsao] = useTypedStorageItem(
    "settings.graphics.postprocessing.ssao",
    "none"
  );
  const [bloom, setBloom] = useTypedStorageItem(
    "settings.graphics.postprocessing.bloom",
    false
  );
  const [waterReflection, setWaterReflection] = useTypedStorageItem(
    "settings.graphics.waterReflection",
    true
  );

  const [depthPrePass, setDepthPrePass] = useTypedStorageItem(
    "settings.graphics.depthPrePass",
    false
  );
  const [debugVis, setDebugVis] = useTypedStorageItem(
    "settings.graphics.postprocessing.debug",
    "none"
  );

  const [_drawDistance, setDrawDistance] = useTypedStorageItem(
    "settings.graphics.drawDistance",
    "dynamic"
  );

  const [_entityDrawLimit, setEntityDrawLimit] = useTypedStorageItem(
    "settings.graphics.entityDrawLimit",
    "auto"
  );

  const [showDetails, setShowDetails] = useState(false);
  const detailsEditable = quality === "custom";
  alwaysShowDetails = alwaysShowDetails || detailsEditable;

  const resolvedSettings = reactResources.use("/settings/graphics/resolved");
  const dynamicSettings = reactResources.use("/settings/graphics/dynamic");
  return (
    <div className="graphics-settings">
      <div className="dialog-button-group">
        <ul className="graphics-settings-list">
          <li>
            <div className="label">Quality</div>
            <select
              name="quality"
              value={resolvedSettings.quality}
              onChange={(e) => setQuality(e.target.value as GraphicsQuality)}
            >
              {Object.keys(zGraphicsQuality.Values).map((e) => (
                <option key={e} value={e}>
                  {startCase(e)}
                </option>
              ))}
            </select>
          </li>
          {!alwaysShowDetails && (
            <li
              className="details"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span>
                Show Details{" "}
                <motion.span
                  style={{ display: "inline-block" }}
                  animate={{ rotate: showDetails ? "90deg" : "0deg" }}
                >
                  ›
                </motion.span>
              </span>
            </li>
          )}
          {showDetails || alwaysShowDetails ? (
            <>
              <li>
                <div className="label">Render Scale</div>
                <RenderScaleSetting disabled={!detailsEditable} />
              </li>
              <li>
                <div className="label">Entity Draw Limit</div>
                <select
                  name="entity-draw-limit"
                  value={resolvedSettings.entityDrawLimit}
                  onChange={(e) =>
                    setEntityDrawLimit(e.target.value as EntityDrawLimit)
                  }
                  disabled={!detailsEditable}
                >
                  {Object.keys(zEntityDrawLimit.Values).map((e) => (
                    <option key={e} value={e}>
                      {startCase(e)}
                      {e === resolvedSettings.entityDrawLimit &&
                        ` (${dynamicSettings.entityDrawLimit})`}
                    </option>
                  ))}
                </select>
              </li>
              <li>
                <div className="label">Draw Distance</div>
                <select
                  name="draw-distance"
                  value={resolvedSettings.drawDistance}
                  onChange={(e) =>
                    setDrawDistance(e.target.value as DrawDistance)
                  }
                  disabled={!detailsEditable}
                >
                  {Object.keys(zDrawDistance.Values).map((e) => (
                    <option key={e} value={e}>
                      {startCase(e)}
                      {e === resolvedSettings.drawDistance &&
                        ` (${dynamicSettings.drawDistance}m)`}
                    </option>
                  ))}
                </select>
              </li>
              <li>
                <DialogCheckbox
                  label="Enable SMAA Antialiasing"
                  checked={resolvedSettings.postprocesses.aa !== "none"}
                  onCheck={() => {
                    setAntiAliasing(antiAliasing === "none" ? "smaa" : "none");
                  }}
                  disabled={!detailsEditable}
                />
              </li>
              <li>
                <DialogCheckbox
                  label="Enable Bloom"
                  checked={!!resolvedSettings.postprocesses.bloom}
                  onCheck={() => {
                    if (!detailsEditable) {
                      return;
                    }
                    setBloom(!bloom);
                  }}
                  disabled={!detailsEditable}
                />
              </li>
              <li>
                <DialogCheckbox
                  label="Enable SSAO"
                  checked={resolvedSettings.postprocesses.ssao !== "none"}
                  onCheck={() => {
                    if (!detailsEditable) {
                      return;
                    }
                    setSsao(ssao === "none" ? "ssao" : "none");
                  }}
                  disabled={!detailsEditable}
                />
              </li>
              <li>
                <DialogCheckbox
                  label="Enable Water Reflection"
                  checked={!!resolvedSettings.postprocesses.waterReflection}
                  onCheck={() => {
                    if (!detailsEditable) {
                      return;
                    }
                    setWaterReflection(!waterReflection);
                  }}
                  disabled={!detailsEditable}
                />
              </li>

              {showDevOptions && (
                <li>
                  <div className="label">Debug Postproc</div>
                  <select
                    name="debug-postproc"
                    value={debugVis}
                    onChange={(e) =>
                      setDebugVis(e.target.value as PostprocessDebug)
                    }
                    disabled={!detailsEditable}
                  >
                    {Object.keys(zPostprocessDebug.Values).map((e) => (
                      <option key={e} value={e}>
                        {startCase(e)}
                      </option>
                    ))}
                  </select>
                </li>
              )}
              <li className="graphics-info">
                <div className="fps">
                  <FPSCounter />
                </div>
                <div className="gpu-name">
                  Graphics Card: {clientConfig.gpuName}
                </div>
              </li>
            </>
          ) : null}
          {showDevOptions && (
            <li>
              <DialogCheckbox
                label="Enable Early Z Depth Pre-Pass"
                checked={depthPrePass}
                onCheck={(checked) => {
                  setDepthPrePass(checked);
                }}
              />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export const GraphicsPreviewSettingsModal: React.FunctionComponent<{
  onClose?: () => void;
  lastModal?: GameModal;
}> = ({ onClose, lastModal }) => {
  const { reactResources } = useClientContext();
  return (
    <div className="dialog-modal">
      <GraphicsSettings alwaysShowDetails={true} />
      <DialogButton
        type="primary"
        onClick={() => {
          if (lastModal) {
            reactResources.set("/game_modal", lastModal);
          } else {
            onClose?.();
          }
        }}
      >
        Done
      </DialogButton>
    </div>
  );
};

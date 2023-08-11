import { AdvancedOptionsRoles } from "@/client/components/AdvancedOptionsRoles";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { CvalHUD } from "@/client/components/CvalHUD";
import { DebugPane } from "@/client/components/DebugPane";
import { CKButton } from "@/client/components/system/CKButton";
import { DialogButton } from "@/client/components/system/DialogButton";
import type { BloomGaussianPass } from "@/client/game/renderers/passes/bloom";
import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import type { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import { dynamicPerformanceUpdateNames } from "@/client/game/resources/dynamic_settings_updater";
import type { TweaksSaveRequest } from "@/pages/api/save_tweaks";
import type {
  CharacterAnimationTiming,
  TrackingCamTweaks,
  TweakableConfig,
  Tweaks,
} from "@/server/shared/minigames/ruleset/tweaks";
import { zSyncShape } from "@/shared/api/sync";
import { jsonPost } from "@/shared/util/fetch_helpers";
import type {
  ObjectLeaves,
  ObjectLeavesOfType,
} from "@/shared/util/type_helpers";
import { motion } from "framer-motion";
import { get, set } from "lodash";
import type { PropsWithChildren } from "react";
import React, { useState } from "react";

const Heading: React.FunctionComponent<
  PropsWithChildren<{ onClick?: () => any }>
> = React.memo(({ onClick, children }) => {
  return (
    <div
      onClick={onClick}
      className="font-lg mb-1 mt-3 select-none font-semibold"
    >
      {children}
    </div>
  );
});

const RangeNumberCombo: React.FunctionComponent<{
  label: string;
  min: number;
  max: number;
  value: number | undefined;
  scale: number;
  onChange: (value: number) => void;
}> = ({ label, min, max, value, scale, onChange }) => {
  return (
    <div className="slider-tweak" key={label}>
      <label>{label}</label>
      {value !== undefined && (
        <>
          <input
            type="range"
            min={min * scale}
            max={max * scale}
            value={value * scale}
            onChange={(e) => {
              e.preventDefault();
              onChange(parseInt(e.target.value, 10) / scale);
            }}
          ></input>
          <input
            type="number"
            value={value}
            step="0.01"
            className="tweak-input"
            onChange={(e) => {
              e.preventDefault();
              if (e.target.value !== "") {
                onChange(parseFloat(e.target.value));
              }
            }}
          />
        </>
      )}
    </div>
  );
};

const ShaderPassUniforms: React.FunctionComponent<{
  pass: RenderPassName;
  tunings: { name: string; min: number; max: number; scale: number }[];
}> = ({ pass, tunings }) => {
  const { rendererController } = useClientContext();
  const [version, setVersion] = useState(0);
  const shaderPass = rendererController.passRenderer?.getPass(
    pass
  ) as ShaderPass;
  if (!shaderPass) {
    return <></>;
  }
  const uniforms = shaderPass.uniforms;

  const params = tunings.map((entry) => {
    return (
      <li key={`${pass}-${entry.name}`}>
        <RangeNumberCombo
          label={entry.name}
          min={entry.min}
          max={entry.max}
          scale={entry.scale}
          value={uniforms[entry.name]?.value}
          onChange={(val) => {
            uniforms[entry.name].value = val;
            setVersion(version + 1);
          }}
        />
      </li>
    );
  });
  return (
    <>
      <Heading>{pass}</Heading>
      <ul>{params}</ul>
    </>
  );
};

const BloomTuning: React.FunctionComponent<{}> = () => {
  const { rendererController } = useClientContext();
  const [version, setVersion] = useState(0);
  const bloomGaussianPasses = [
    rendererController.passRenderer?.getPass("bloomGaussian0"),
    rendererController.passRenderer?.getPass("bloomGaussian1"),
  ] as (BloomGaussianPass | undefined)[];
  if (
    bloomGaussianPasses[0] === undefined ||
    bloomGaussianPasses[1] === undefined
  ) {
    return <></>;
  }

  const scale = 1 / 1024;
  return (
    <>
      <Heading>Bloom</Heading>
      <ul>
        <li>
          <RangeNumberCombo
            key="width"
            label="Width"
            min={0}
            max={100}
            scale={1000}
            value={bloomGaussianPasses[0].width / scale}
            onChange={(val) => {
              for (const pass of bloomGaussianPasses) {
                if (!pass) {
                  continue;
                }
                pass.width = val * scale;
                pass.updateSize();
              }
              setVersion(version + 1);
            }}
          />
        </li>
      </ul>
    </>
  );
};

const PostprocessingOptions: React.FunctionComponent<{}> = () => {
  const { rendererController } = useClientContext();
  return (
    <div className="postprocess-passes">
      <h1>Postprocess Tuning (not persisted)</h1>
      <Heading>Enabled Postprocesses</Heading>
      <ol>
        {rendererController.passRenderer &&
          [...rendererController.passRenderer.postprocesses()].map((pass) => (
            <li key={pass.name}>{pass.name}</li>
          ))}
      </ol>
      <ShaderPassUniforms
        pass="skyFade"
        tunings={[
          { name: "timeScale", min: 0, max: 0.01, scale: 100000 },
          { name: "cloudUvScale", min: 0, max: 10000, scale: 10 },
          { name: "planeHeight", min: 0, max: 200, scale: 10 },
          { name: "planeOffset", min: 0, max: 0.5, scale: 10000 },
          { name: "cloudiness", min: 0, max: 1, scale: 1000 },
          { name: "skyBrightness", min: 0, max: 500, scale: 1000 },
          { name: "skyPow", min: 0, max: 10, scale: 1000 },
        ]}
      />
      <ShaderPassUniforms
        pass="ssao"
        tunings={[
          { name: "strength", min: 0.01, max: 10, scale: 1000 },
          { name: "lightening", min: 0.01, max: 10, scale: 1000 },
        ]}
      />
      <BloomTuning />
    </div>
  );
};

const CollapsableTweakSet: React.FunctionComponent<
  PropsWithChildren<{ title: string }>
> = React.memo(({ title, children }) => {
  const [showTweaks, setShowTweaks] = useState(false);
  return (
    <>
      <Heading onClick={() => setShowTweaks(!showTweaks)}>
        {title}{" "}
        <motion.span
          className="inline-block"
          animate={{ rotate: showTweaks ? "90deg" : "0deg" }}
        >
          ›
        </motion.span>
      </Heading>

      {showTweaks && children}
    </>
  );
});

export const clientSaveTweakableConfig = async (tweaks: TweakableConfig) => {
  await jsonPost<void, TweaksSaveRequest>("/api/save_tweaks", {
    tweaks,
  });
};

export const AdvancedOptions: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const tweakableConfig = context.reactResources.use("/tweaks");
  const [pendingArtificialLag, setPendingArtificialLag] = useState(
    context.clientConfig.artificialLagMs?.mean ?? 0
  );

  const [savingTweaks, setSavingTweaks] = useState(false);

  const textTweak = (name: string, path: ObjectLeaves<Tweaks>) => {
    const value = get(tweakableConfig, path) as string;
    return (
      <div className="text-tweak">
        <label>
          <div className="label-name">{name}</div>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              context.reactResources.update("/tweaks", (tweaks) => {
                set(tweaks, path, e.target.value);
              });
            }}
          />
        </label>
      </div>
    );
  };

  const sliderTweak = (
    name: string,
    path: ObjectLeaves<Tweaks>,
    min: number,
    max: number,
    scale = 100,
    _first = false
  ) => {
    const value = get(tweakableConfig, path) as number;
    return (
      <RangeNumberCombo
        key={path}
        label={name}
        min={min}
        max={max}
        scale={scale}
        value={value}
        onChange={(val) => {
          context.reactResources.update("/tweaks", (tweaks) => {
            set(tweaks, path, val);
          });
        }}
      />
    );
  };
  const dropdownTweak = (
    name: string,
    path: ObjectLeaves<typeof tweakableConfig>,
    values: string[]
  ) => {
    const value = get(tweakableConfig, path) as string;
    return (
      <div className="dropdown-tweak">
        <label>
          <div className="label-name">{name}</div>
          <select
            value={value}
            onChange={(e) => {
              context.reactResources.update("/tweaks", (tweaks) => {
                set(tweaks, path, e.target.value);
              });
            }}
          >
            {values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  };

  const checkboxTweak = (
    name: string,
    path: ObjectLeaves<typeof tweakableConfig>
  ) => {
    const value = get(tweakableConfig, path) as boolean;
    return (
      <div className="checkbox-tweak">
        <label>
          <div className="label-name">{name}</div>
          <input
            name="physicsEnabled"
            type="checkbox"
            checked={value}
            onChange={() => {
              context.reactResources.update("/tweaks", (tweaks) => {
                set(tweaks, path, !value);
              });
            }}
          />
        </label>
      </div>
    );
  };

  const animationScalingTweak = (
    path: ObjectLeavesOfType<CharacterAnimationTiming, Tweaks>
  ) => {
    const value = get(tweakableConfig, path);
    return (
      <div>
        {(
          Array.from(
            Object.keys(value)
          ) as ObjectLeaves<CharacterAnimationTiming>[]
        ).map((x) => sliderTweak(x, `characterAnimationTiming.${x}`, 0, 10))}
      </div>
    );
  };

  const cameraGroupTweak = (
    name: string,
    path: ObjectLeavesOfType<TrackingCamTweaks, Tweaks>
  ) => {
    return (
      <div>
        <Heading> {name} </Heading>
        {sliderTweak("Cam Offset Back", `${path}.offsetBack`, -10, 10)}
        {sliderTweak("Cam Offset Right", `${path}.offsetRight`, -10, 10)}
        {sliderTweak("Cam Offset Up", `${path}.offsetUp`, -10, 10)}
        {sliderTweak("Cam FOV", `${path}.fov`, 1, 179, 1)}
        {sliderTweak(
          "Start March Distance",
          `${path}.startMarchDistance`,
          0,
          10,
          100
        )}
        {sliderTweak("Run FOV boost", `${path}.runFovIncrease`, 0, 50)}
        {sliderTweak(
          "Run offset back boost",
          `${path}.runOffsetBackIncrease`,
          0,
          50
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-scroll p-1">
      <div className="horizontal-button-group">
        <DialogButton
          onClick={() => {
            if (savingTweaks) {
              return;
            }

            void (async () => {
              setSavingTweaks(true);
              try {
                await clientSaveTweakableConfig(tweakableConfig);
              } finally {
                setSavingTweaks(false);
              }
            })();
          }}
        >
          {savingTweaks ? "Saving..." : "Save Tweaks"}
        </DialogButton>
      </div>
      <DebugPane />
      <CvalHUD />
      <AdvancedOptionsRoles />
      <div className="tweak-with-button">
        <RangeNumberCombo
          label="Fake Lag"
          min={0}
          max={2000}
          scale={0.1}
          value={pendingArtificialLag}
          onChange={(val) => {
            setPendingArtificialLag(val);
          }}
        ></RangeNumberCombo>
        <CKButton
          onClick={() => {
            window.location.href = `/?artificialLagMs=${pendingArtificialLag}`;
          }}
        >
          Apply
        </CKButton>
      </div>
      <Heading>Day / Night</Heading>
      {checkboxTweak("Synchronize server time", "synchronizeServerTime")}
      {checkboxTweak("Override Time of Day", "overrideTimeOfDay")}
      {checkboxTweak("Sun Dilation", "sunDilation")}
      {sliderTweak("Time of Day (%)", "timeOfDay", 0.0, 100.0, 100)}
      {sliderTweak("Fog Start (of camera far)", "fogStartFar", 0, 1.0, 1000)}
      {checkboxTweak("Purkinje Shift", "night.purkinje")}
      {sliderTweak("Purkinje Strength", "night.purkinjeStrength", 0, 1.0, 100)}
      {checkboxTweak("Eye Adaptation", "night.eyeAdaptation")}
      <Heading>X-Ray Vision</Heading>
      {checkboxTweak("Show Gremlins", "showGremlins")}
      {checkboxTweak("Show Npcs", "showNpcs")}
      {checkboxTweak("Show Placeables", "showPlaceables")}
      {checkboxTweak("Show Inspected IDs", "showInspectedIds")}
      {checkboxTweak("Show Hidden Inspection Overlays", "showHiddenInspects")}
      {checkboxTweak("Show Wireframe", "showWireframe")}
      {checkboxTweak("Show Collision Boxes", "showCollisionBoxes")}
      {checkboxTweak("Show Shard Boundaries", "showShardBoundaries")}
      {checkboxTweak("Show Stale Block Shards", "showStaleBlockShards")}
      {checkboxTweak("Show Stale Glass Shards", "showStaleGlassShards")}
      {checkboxTweak("Show Stale Flora Shards", "showStaleFloraShards")}
      {checkboxTweak("Show Group Boxes", "showGroupBoxes")}
      {checkboxTweak("Show Entity AABBs", "showPlayerAABB")}
      {checkboxTweak(
        "Show Player Attack Region",
        "showPlayerMeleeAttackRegion"
      )}
      {checkboxTweak("Show Edited Voxels", "showEditedVoxels")}
      {checkboxTweak("Show Placers", "showPlacerVoxels")}
      {checkboxTweak("Show Dangling Occupancy", "showDanglingOccupancy")}
      {checkboxTweak("Show Water Sources", "showWaterSources")}
      {checkboxTweak("Occlusion On Overlays", "performOverlayOcclusion")}
      {checkboxTweak("CSS 3D Enabled", "css3DEnabled")}
      {sliderTweak("CSS 3D Load Radius", "css3DRadius", 0, 96, 1)}
      {sliderTweak("CSS 3D Unload Radius", "css3DUnloadRadius", 0, 96, 1)}
      {checkboxTweak("Capture 3D CSS in screenshot", "useCSSCapture")}
      <Heading>Session</Heading>
      {checkboxTweak("Confirm to Close Tab", "confirmToCloseTab")}
      <Heading>Language</Heading>
      {checkboxTweak("Chat Voices", "chatVoices")}
      {checkboxTweak("Chat Translation", "chatTranslation")}
      {textTweak("Additional Language", "additionalLanguage")}
      <Heading>Perf</Heading>
      {checkboxTweak("Defer scene render", "deferSceneRender")}
      {checkboxTweak("Enable gpu timer", "enableGpuTimer")}
      <Heading>Simulation</Heading>
      {sliderTweak("Frame Rate", "sim.frameRate", 1, 200)}
      {sliderTweak("Catchup ticks", "sim.maxCatchupTicks", 0, 10)}
      {checkboxTweak("Local player smoothing", "sim.smoothLocalPlayer")}
      <Heading>Sync</Heading>
      {checkboxTweak("Override Sync Radius", "overrideSyncRadius")}
      {sliderTweak("Sync Radius", "syncRadius", 32, 1000)}
      {dropdownTweak("Sync Shape", "syncShape", zSyncShape.options)}
      {checkboxTweak("Sync Player position", "syncPlayerPosition")}
      {checkboxTweak("Permit void movement", "permitVoidMovement")}
      <Heading>Occlusion Culling</Heading>
      {checkboxTweak("Show Occluder Mesh", "showOccluderMesh")}
      {checkboxTweak("Show Occlusion Mask", "showOcclusionMask")}
      {sliderTweak("Step", "occlusionMeshStep", 0, 400)}
      <Heading>Player</Heading>
      {checkboxTweak("Show Player AABB", "showPlayerAABB")}
      {sliderTweak("Player Scale", "playerPhysics.scale", 0.1, 5, 100, true)}
      <Heading>Protection Fields</Heading>
      {dropdownTweak("Protection Field Shader", "protectionField.shader", [
        "none",
        "default",
        "hexagonal_bloom",
      ])}
      {dropdownTweak("Protection Field Texture", "protectionField.texture", [
        "textures/protection_grid_experiment1",
        "textures/protection_grid_experiment2",
        "textures/protection_grid_experiment3",
        "textures/protection_grid_experiment4",
      ])}
      {sliderTweak(
        "Protection Field Texture Scale",
        "protectionField.textureScale",
        0.01,
        1.0,
        100
      )}
      {sliderTweak(
        "Protection Field Opacity",
        "protectionField.opacity",
        0.001,
        1.0,
        100
      )}
      {checkboxTweak("Protection Field Ring", "protectionField.ring")}
      {checkboxTweak(
        "Protection Field Fade Opac Only",
        "protectionField.fadeOutOpacityOnly"
      )}
      {checkboxTweak(
        "Protection Field Hide With Camera",
        "protectionField.hideWhenCameraHeld"
      )}
      {checkboxTweak(
        "Protection Field Hide Behind Character",
        "protectionField.hideBehindCharacter"
      )}
      {checkboxTweak("Protection Fade Out", "protectionField.fadeOut")}
      {dropdownTweak("Protection Highlight", "protectionField.highlight", [
        "none",
        "smooth",
        "pixel",
      ])}
      {sliderTweak(
        "Hexagonal Grid Thickness",
        "protectionField.hexThickness",
        0.001,
        0.1,
        100
      )}
      {sliderTweak(
        "Hexagonal Grid Smoothing",
        "protectionField.hexSmoothing",
        0.001,
        0.1,
        100
      )}
      {sliderTweak(
        "Hexagonal Grid Scale",
        "protectionField.hexGridScale",
        0.001,
        1.0
      )}
      {sliderTweak(
        "Hexagonal Grid Quantization",
        "protectionField.hexQuantization",
        0,
        100
      )}
      {sliderTweak(
        "Hexagonal Grid Intensity",
        "protectionField.hexIntensity",
        0.001,
        1.0,
        1000
      )}
      {sliderTweak(
        "Hex Shimmer Brightness",
        "protectionField.hexShimmerBrightness",
        0.01,
        2.0
      )}
      {sliderTweak(
        "Hex Shimmer Speed",
        "protectionField.hexShimmerSpeed",
        0.01,
        2.0
      )}
      {sliderTweak(
        "Hex Shimmer Fatness",
        "protectionField.hexShimmerFatness",
        0.01,
        2.0
      )}
      {sliderTweak(
        "Hex Shimmer Frequency",
        "protectionField.hexShimmerFrequency",
        0.1,
        10.0
      )}
      <CollapsableTweakSet title="Water">
        {sliderTweak("Quantization", "water.normalQuantization", 0, 100)}
        {sliderTweak("Intensity", "water.normalIntensity", 0, 1)}
        {sliderTweak("Octave1", "water.normalOctave1", 0, 5)}
        {sliderTweak("Octave2", "water.normalOctave2", 0, 5)}
        {sliderTweak("Speed", "water.normalSpeed", 0, 2)}
        {sliderTweak("Distortion", "water.normalDistortion", 0, 2)}
      </CollapsableTweakSet>

      <Heading>Build</Heading>
      {sliderTweak("Radius", "building.changeRadius", 0, 20)}
      {sliderTweak("Placement Radius", "building.placementRadius", 0, 20)}
      {checkboxTweak(
        "Allow Self Intersecting Placements",
        "building.allowSelfIntersecting"
      )}
      {checkboxTweak(
        "Terrain Mesh Short Circuiting",
        "building.terrainMeshShortCircuiting"
      )}
      {checkboxTweak("Eager Block Editing", "building.eagerBlocks")}

      <h3>Melee Attack Region</h3>
      {sliderTweak("left", "combat.meleeAttackRegion.left", -5, 5, 10)}
      {sliderTweak("right", "combat.meleeAttackRegion.right", -5, 5, 10)}
      {sliderTweak("bottom", "combat.meleeAttackRegion.bottom", -5, 5, 10)}
      {sliderTweak("top", "combat.meleeAttackRegion.top", -5, 5, 10)}
      {sliderTweak("near", "combat.meleeAttackRegion.near", -5, 5, 10)}
      {sliderTweak("far", "combat.meleeAttackRegion.far", -5, 5, 10)}

      <Heading>Health / Vulnerability </Heading>
      {sliderTweak(
        "Health Regen Begin After Damage (s)",
        "healthRegenTimeThresholdS",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Regen Tick Amount",
        "healthRegenAmount",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Regen Tick Time (s)",
        "healthRegenTickTimeS",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Water Damage Tick Amount",
        "healthWaterDamageAmount",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Water Damage Tick Time (s)",
        "healthWaterDamageTickTimeS",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Water Damage Begin After (s)",
        "healthWaterDamageThresholdS",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Lava Damage Tick Amount",
        "healthLavaDamageAmount",
        0.0,
        100.0,
        100
      )}
      {sliderTweak(
        "Health Lava Damage Begin After (s)",
        "healthLavaDamageThresholdS",
        0.0,
        100.0,
        100
      )}
      <Heading>Fire Health / Damage</Heading>
      {sliderTweak("Regen Radius", "fireHealth.healRadius", 0.0, 10.0, 10)}
      {sliderTweak("Regen HP Amount", "fireHealth.healHp", 0.0, 10.0, 10)}
      {sliderTweak("Heal Delay (s)", "fireHealth.healDelayS", 0.0, 10.0, 10)}
      {sliderTweak(
        "Heal Interval (s)",
        "fireHealth.healIntervalS",
        0.0,
        10.0,
        10
      )}
      {sliderTweak("Damage Radius", "fireHealth.damageRadius", 0.0, 10.0, 10)}
      {sliderTweak("Damage HP Amount", "fireHealth.damageHp", 0.0, 10.0, 10)}
      {sliderTweak(
        "Damage Delay (s)",
        "fireHealth.damageDelayS",
        0.0,
        10.0,
        10
      )}
      {sliderTweak(
        "Damage Interval (s)",
        "fireHealth.damageIntervalS",
        0.0,
        10.0,
        10
      )}
      <Heading>Player Physics</Heading>
      {sliderTweak(
        "Swimming Pitch Offset",
        "playerPhysics.swimmingPitchOffset",
        -1.0,
        1.0,
        100
      )}
      {sliderTweak(
        "Swimming Speed",
        "playerPhysics.swimmingSpeed",
        0.5,
        2,
        100
      )}
      {sliderTweak("Fly Mode Scaling", "flyModeScaling", 1.0, 100.0, 100)}
      {sliderTweak("Forward", "playerPhysics.forward", 0, 2.0, 100)}
      {sliderTweak("Reverse", "playerPhysics.reverse", 0, 2.0, 100)}
      {sliderTweak("Crouch Speed", "playerPhysics.crouch", 0, 2.0, 100)}
      {sliderTweak("Jump", "playerPhysics.jump", 0, 1.0, 100)}
      {sliderTweak(
        "In Air Multiplier",
        "playerPhysics.inAirMultiplier",
        0,
        1.0,
        0.01
      )}
      {sliderTweak(
        "Lateral Multiplier",
        "playerPhysics.lateralMultiplier",
        0,
        1.0,
        0.01
      )}
      {sliderTweak(
        "Run Multiplier",
        "playerPhysics.runMultiplier",
        0,
        10.0,
        0.1
      )}
      {sliderTweak(
        "Auto Jump Ratio",
        "playerPhysics.autoJumpRatio",
        0,
        180,
        100
      )}
      {sliderTweak(
        "Window after leaving ground you can still jump (ms)",
        "playerPhysics.jumpWindowMs",
        0,
        1000,
        200
      )}
      {sliderTweak("View Speed", "playerPhysics.viewSpeed", 0, 2.0, 100)}
      <Heading>World Physics</Heading>
      {sliderTweak(
        "Air Resistence",
        "physics.airResistance",
        0.0,
        1,
        1000,
        true
      )}
      {sliderTweak("Escape Dampening", "physics.escapeDampening", 0, 1.0, 100)}
      {sliderTweak("Friction", "physics.friction", 0, 1.0, 100)}
      {sliderTweak("Gravity", "physics.gravity", 0, 1.0, 100)}
      <Heading>Camera Collisions</Heading>
      {checkboxTweak(
        "Enable NPC + Player Camera Collisions",
        "trackingCamNPCEntityCollisions"
      )}
      {sliderTweak(
        "Tracking Momentum",
        "trackingCamSmoothMomentum",
        0,
        1.0,
        100
      )}
      {sliderTweak(
        "Tracking Overlap For Collision",
        "trackingCamOverlapRequired",
        0,
        1.0,
        100
      )}
      {cameraGroupTweak("Cam", "thirdPersonCam")}
      {cameraGroupTweak("Reverse Cam", "reverseThirdPersonCam")}
      {cameraGroupTweak("FPS Cam", "firstPersonCam")}
      {cameraGroupTweak("In-Game Cam - Normal", "inGameCamera.normal")}
      {cameraGroupTweak("In-Game Cam - Selfie", "inGameCamera.selfie")}
      {cameraGroupTweak("In-Game Cam - FPS", "inGameCamera.fps")}
      {cameraGroupTweak("Group Placement Cam", "groupPlacementCam")}
      {cameraGroupTweak("NPC Cam", "npcCam")}
      {cameraGroupTweak("Fishing Cam — Cast", "fishingCam")}
      {cameraGroupTweak("Fishing Cam — Caught", "fishingCamCaught")}
      {cameraGroupTweak(
        "Robot Placement Preview Cam",
        "robotPlacementPreviewCam"
      )}

      <Heading>Fishing</Heading>
      <h3>Charge</h3>
      {sliderTweak(
        "Power Scaling",
        "fishingChargingCastParams.powerScaling",
        0,
        100.0,
        1000
      )}
      {sliderTweak(
        "Power Intercept",
        "fishingChargingCastParams.powerIntercept",
        0,
        100.0,
        1000
      )}
      {sliderTweak(
        "Charge Duration",
        "fishingChargingCastParams.fullPowerDuration",
        0,
        10.0,
        100
      )}

      <h3>Bite</h3>
      {sliderTweak(
        "Bite Min Time",
        "fishingBiteParams.biteMinTime",
        -10.0,
        10.0,
        100
      )}
      {sliderTweak(
        "Bite Max Time",
        "fishingBiteParams.biteMaxTime",
        -10.0,
        10.0,
        100
      )}
      {sliderTweak(
        "Bite Min Duration",
        "fishingBiteParams.biteMinDuration",
        -10.0,
        10.0,
        100
      )}
      {sliderTweak(
        "Bite Max Duration",
        "fishingBiteParams.biteMaxDuration",
        -10.0,
        10.0,
        100
      )}

      <h3>Minigame</h3>
      {sliderTweak(
        "Highlight Bar Click Accel",
        "fishingCatchMinigameParams.catchBarAccelerationClicked",
        0,
        10.0,
        100
      )}
      {sliderTweak(
        "Highlight Bar Unclick Accel",
        "fishingCatchMinigameParams.catchBarAccelerationUnclicked",
        -10,
        0.0,
        100
      )}
      {sliderTweak(
        "Highlight Bar Spring Coefficient",
        "fishingCatchMinigameParams.catchBarBottomSpringCoefficient",
        0,
        1.0,
        100
      )}

      {sliderTweak(
        "Fish Start Location",
        "fishingCatchMinigameParams.fishStartLocation",
        0,
        1.0,
        100
      )}
      {sliderTweak(
        "Fish Random Walk Intercept",
        "fishingCatchMinigameParams.fishRandomWalkVelocityPerSecondIntercept",
        0,
        10.0,
        100
      )}
      {sliderTweak(
        "Fish Random Walk Length Scaling",
        "fishingCatchMinigameParams.fishRandomWalkVelocityPerSecondFishLengthScaling",
        0,
        10.0,
        100
      )}

      {sliderTweak(
        "Fill Bar Size Fish Scaling",
        "fishingCatchMinigameParams.fillBarSizeFishLengthScaling",
        0,
        10.0,
        1000
      )}
      {sliderTweak(
        "Fill Bar Start Filled",
        "fishingCatchMinigameParams.fillBarStart",
        0,
        1.0,
        100
      )}
      {sliderTweak(
        "Fill Bar Increase Per Second",
        "fishingCatchMinigameParams.fillBarIncreasePerSecond",
        0,
        10.0,
        100
      )}
      {sliderTweak(
        "Fill Bar Decrease Per Second",
        "fishingCatchMinigameParams.fillBarDecreasePerSecond",
        -10,
        0.0,
        100
      )}

      <Heading>Camera Damage Shake Effect</Heading>
      {sliderTweak(
        "Min Damage (fraction of hp) for shake",
        "onDamageCameraShake.minDamageFractionForShake",
        0,
        1
      )}
      {sliderTweak(
        "Minimum magnitude of shake (low damage)",
        "onDamageCameraShake.minDampedMagnitude",
        0,
        1
      )}
      {sliderTweak(
        "Maximum magnitude of shake (max damage)",
        "onDamageCameraShake.maxDampedMagnitude",
        0,
        1
      )}
      {sliderTweak("Repeats", "onDamageCameraShake.repeats", 0, 10, 1)}
      {sliderTweak("Duration", "onDamageCameraShake.duration", 0, 2000)}

      <Heading>You are the group</Heading>
      {sliderTweak(
        "Grid Snapping",
        "youAreTheGroupSnappingCharacteristic",
        0,
        20.0,
        100
      )}
      {sliderTweak("Grid Snap Damping", "youAreTheGroupDamping", 0, 0.99, 100)}
      <Heading>Character Animation Scaling</Heading>
      {animationScalingTweak("characterAnimationTiming")}
      <Heading>Remote Player Smoothing</Heading>
      {sliderTweak(
        "Interp Duration",
        "networking.playerSmoothing.interpDuration",
        0,
        20
      )}
      <Heading>Max Client Player Render Limit</Heading>
      {sliderTweak(
        "Max Client Player Render Limit",
        "clientRendering.remotePlayerRenderLimit",
        1,
        500
      )}
      {sliderTweak(
        "Max Client NPC Render Limit",
        "clientRendering.npcRenderLimit",
        1,
        500
      )}
      {sliderTweak(
        "Max Client Placeable Render Limit",
        "clientRendering.placeableRenderLimit",
        1,
        500
      )}
      <Heading>Disabled Renderers</Heading>
      {context.rendererController
        .rendererNames()
        .map((rendererName) =>
          checkboxTweak(
            rendererName,
            `clientRendering.disabledRenderers.${rendererName}`
          )
        )}
      <Heading>Disabled RenderPasses</Heading>
      {context.rendererController
        .scenePassNames()
        .map((passName) =>
          checkboxTweak(passName, `clientRendering.disabledPasses.${passName}`)
        )}
      <Heading>Disabled Graphics Dynamic Updates</Heading>
      {dynamicPerformanceUpdateNames.map((updateName) =>
        checkboxTweak(
          updateName,
          `clientRendering.disabledDynamicPerformanceUpdates.${updateName}`
        )
      )}

      <Heading>Map Tweaks</Heading>
      {sliderTweak("Pannable max zoom", "pannableMapMaxZoom", -5, 5, 1)}
      {sliderTweak("Pannable min zoom", "pannableMapMinZoom", -5, 5, 1)}
      {sliderTweak("Bounds resist", "pannableMapBoundsViscosity", 0, 1, 100)}
      {sliderTweak("Minimap zoom", "minimapZoom", -2, 4, 1)}
      {checkboxTweak("Big Navigation Aids", "bigNavigationAids")}
      {checkboxTweak("Show Icon Filters", "mapIconFilters")}
      <PostprocessingOptions />
      <>
        <CKButton onClick={() => context.resources.clear()}>
          Clear Resource Cache
        </CKButton>
      </>
    </div>
  );
};

export default AdvancedOptions;

import { InlineFileUpload } from "@/client/components/InlineFileUpload";
import { ThreeBasicObjectPreview } from "@/client/components/ThreeBasicObjectPreview";
import { AdminPage } from "@/client/components/admin/AdminPage";
import { DialogButton } from "@/client/components/system/DialogButton";
import type {
  ParticleSystemDynamics,
  SpawnType,
} from "@/client/game/resources/particles";
import {
  ParticleSystem,
  ParticleSystemMaterials,
} from "@/client/game/resources/particles";
import styles from "@/client/styles/admin.particle_editor.module.css";
import { useEffectAsync } from "@/client/util/hooks";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { Vec2, Vec3 } from "@/shared/math/types";
import { downloadTextFile } from "@/shared/util/helpers";
import type { InferGetServerSidePropsType } from "next";
import React, { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import smokeIcon from "/public/textures/particles/smoke.png";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async ({ context: {} }) => {
    return {
      props: {},
    };
  }
);

export const RangeNumberCombo: React.FunctionComponent<{
  min: number;
  max: number;
  value: number;
  scale: number;
  onChange: (value: number) => void;
}> = ({ min, max, value, scale, onChange }) => {
  return (
    <>
      <input
        type="number"
        value={value}
        min={0}
        max={1}
        step={0.01}
        className="tweak-input"
        onChange={(e) => {
          e.preventDefault();
          if (e.target.value !== "") {
            onChange(parseFloat(e.target.value));
          }
        }}
      />
      <input
        type="range"
        min={min * scale}
        max={max * scale}
        value={value * scale}
        onChange={(e) => {
          e.preventDefault();
          onChange(parseInt(e.target.value, 10) / scale);
        }}
      />
    </>
  );
};

export const Vec3Input: React.FunctionComponent<{
  value: Vec3;
  onChange: (value: Vec3) => unknown;
}> = ({ value, onChange }) => {
  return (
    <div className={styles["vec3-input"]}>
      <div>
        <input
          type="number"
          step="0.01"
          value={value[0]}
          onChange={(e) => {
            e.preventDefault();
            if (e.target.value !== "") {
              onChange([parseFloat(e.target.value), value[1], value[2]]);
            }
          }}
        />
        <div className="label">X</div>
      </div>
      <div>
        <input
          step="0.01"
          type="number"
          value={value[1]}
          onChange={(e) => {
            e.preventDefault();
            if (e.target.value !== "") {
              onChange([value[0], parseFloat(e.target.value), value[2]]);
            }
          }}
        />
        <div className="label">Y</div>
      </div>
      <div>
        <input
          type="number"
          step="0.01"
          value={value[2]}
          onChange={(e) => {
            e.preventDefault();
            if (e.target.value !== "") {
              onChange([value[0], value[1], parseFloat(e.target.value)]);
            }
          }}
        />
        <div className="label">Z</div>
      </div>
    </div>
  );
};

export const Vec3MinMaxInput: React.FunctionComponent<{
  name: string;
  value: [Vec3, Vec3];
  onChange: (value: [Vec3, Vec3]) => unknown;
}> = ({ name, value, onChange }) => {
  return (
    <>
      <tr>
        <td>
          <label>{name} Min</label>
        </td>
        <td>
          <Vec3Input
            value={value[0]}
            onChange={(v) => onChange([v, value[1]])}
          />
        </td>
      </tr>
      <tr>
        <td>
          <label>{name} Max</label>
        </td>
        <td>
          <Vec3Input
            value={value[1]}
            onChange={(v) => onChange([value[0], v])}
          />
        </td>
      </tr>
    </>
  );
};

export const FloatMinMaxInput: React.FunctionComponent<{
  value: Vec2;
  onChange: (value: Vec2) => unknown;
}> = ({ value, onChange }) => {
  return (
    <>
      <div className={styles["vec3-input"]}>
        <div>
          <input
            type="number"
            step="0.01"
            value={value[0]}
            onChange={(e) => {
              e.preventDefault();
              if (e.target.value !== "") {
                onChange([parseFloat(e.target.value), value[1]]);
              }
            }}
          />
          <div>Min</div>
        </div>
        <div>
          <input
            type="number"
            step="0.01"
            value={value[1]}
            onChange={(e) => {
              e.preventDefault();
              if (e.target.value !== "") {
                onChange([value[0], parseFloat(e.target.value)]);
              }
            }}
          />
          <div>Max</div>
        </div>
        <div></div>
      </div>
    </>
  );
};

export const SpawnTypeChanger: React.FunctionComponent<{
  value: SpawnType;
  onChange: (value: SpawnType) => unknown;
}> = ({ value, onChange }) => {
  return (
    <>
      <tr>
        <td>
          <label>Span Type</label>
        </td>
        <td className={styles["radio"]}>
          <label>
            <input
              type="radio"
              checked={value.kind === "point"}
              onChange={() => {
                onChange({
                  kind: "point",
                  pos: [0, 0, 0],
                });
              }}
            />
            Point
          </label>
          <label>
            <input
              type="radio"
              checked={value.kind === "relative_aabb"}
              onChange={() => {
                onChange({
                  kind: "relative_aabb",
                  range: [
                    [-0.5, -0.5, -0.5],
                    [0.5, 0.5, 0.5],
                  ],
                });
              }}
            />
            Box
          </label>
        </td>
      </tr>
      {value.kind === "point" && (
        <tr>
          <td>
            <label> Origin </label>
          </td>
          <td>
            <Vec3Input
              value={value.pos ?? [0, 0, 0]}
              onChange={(v) => onChange({ kind: "point", pos: v })}
            />
          </td>
        </tr>
      )}
      {value.kind === "relative_aabb" && (
        <Vec3MinMaxInput
          name="Box"
          value={value.range}
          onChange={(v) => onChange({ kind: "relative_aabb", range: v })}
        />
      )}
    </>
  );
};

type PreviewParams = {
  showUnitCube: boolean;
};

export const ParticleEditorParams: React.FunctionComponent<{
  onSystemChange: (system: ParticleSystem) => unknown;
  previewParams: PreviewParams;
  onPreviewParamsChange: (previewParams: PreviewParams) => unknown;
}> = ({ onSystemChange, previewParams, onPreviewParamsChange }) => {
  const [iconSrc, setIconSrc] = useState(smokeIcon.src);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);
  const systemUploadRef = useRef<HTMLInputElement | null>(null);

  const [systemDynamics, setSystemDynamics] = useState<ParticleSystemDynamics>({
    spawnType: {
      kind: "point",
      pos: [0, 0, 0],
    },
    loop: true,
    fadeAfterRelativeLifespan: 0.9,
    emissiveBoost: 0,
    numParticles: 2000,
    birthTimeRange: [0.0, 0.0],
    baseAlphaRange: [1.0, 1.0],
    lifespanRange: [2, 5],
    velocityRange: [
      [-0.1, 0.05, -0.1],
      [0.1, 4.0, 0.1],
    ],
    angleVelocityRange: [0, 0],
    acceleration: [0, 0, 0],
    sizeRange: [0.2, 0.2],
  });

  useEffectAsync(async () => {
    const mesh = await ParticleSystemMaterials.createTextureMaterialsFromURL(
      systemDynamics,
      iconSrc
    );
    const system = new ParticleSystem(mesh, performance.now() / 1000.0);
    onSystemChange(system);
  }, [iconSrc, systemDynamics]);

  const changeSystemDynamics = (overrides: Partial<ParticleSystemDynamics>) => {
    setSystemDynamics({
      ...systemDynamics,
      ...overrides,
    });
  };

  const changePreviewParams = (overrides: Partial<PreviewParams>) => {
    onPreviewParamsChange({
      ...previewParams,
      ...overrides,
    });
  };

  return (
    <div>
      <table className={styles["editor-table"]}>
        <tr>
          <td colSpan={2}>
            <h4>Preview Options</h4>
          </td>
        </tr>
        <tr>
          <td>
            <label>Show Unit Cube</label>
          </td>
          <td>
            <input
              type="checkbox"
              checked={previewParams.showUnitCube}
              onChange={(e) =>
                changePreviewParams({
                  showUnitCube: e.target.checked,
                })
              }
            />
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <h4>Dynamics</h4>
          </td>
        </tr>
        <tr>
          <td>
            <label>Particle URL </label>
          </td>
          <td>
            <input
              type="url"
              value={iconSrc}
              onChange={(e) => setIconSrc(e.target.value)}
            />
            <InlineFileUpload
              ref={imageUploadRef}
              onUpload={(file) => {
                void (async () => {
                  const reader = new FileReader();
                  reader.addEventListener(
                    "load",
                    () => {
                      if (typeof reader.result === "string") {
                        setIconSrc(reader.result);
                      }
                    },
                    false
                  );
                  reader.readAsDataURL(file);
                })();
              }}
            />
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                imageUploadRef.current?.click();
              }}
            >
              {" "}
              Upload
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <label>Num Particles</label>
          </td>
          <td>
            <input
              type="number"
              value={systemDynamics.numParticles}
              onChange={(e) =>
                changeSystemDynamics({
                  numParticles: parseFloat(e.target.value),
                })
              }
            />
          </td>
        </tr>
        <tr>
          <td>
            <label> Birth time </label>
          </td>
          <td>
            <FloatMinMaxInput
              value={systemDynamics.birthTimeRange ?? [0, 0]}
              onChange={(birthTimeRange) =>
                changeSystemDynamics({ birthTimeRange })
              }
            />
          </td>
        </tr>

        <tr>
          <td>
            <label> Lifespan </label>
          </td>
          <td>
            <FloatMinMaxInput
              value={systemDynamics.lifespanRange ?? [0, 1]}
              onChange={(lifespanRange) =>
                changeSystemDynamics({ lifespanRange })
              }
            />
          </td>
        </tr>

        <SpawnTypeChanger
          value={systemDynamics.spawnType}
          onChange={(spawnType) => {
            changeSystemDynamics({ spawnType });
          }}
        />

        <tr>
          <td colSpan={2}>
            <h4> Physics </h4>
          </td>
        </tr>

        <Vec3MinMaxInput
          name="Velocity"
          value={systemDynamics.velocityRange}
          onChange={(velocityRange) => changeSystemDynamics({ velocityRange })}
        />

        <tr>
          <td>
            <label> Acceleration </label>
          </td>

          <td>
            <Vec3Input
              value={systemDynamics.acceleration}
              onChange={(e) => changeSystemDynamics({ acceleration: e })}
            />
          </td>
        </tr>

        <tr>
          <td>
            <label> Angular Velocity </label>
          </td>

          <td>
            <FloatMinMaxInput
              value={systemDynamics.angleVelocityRange ?? [0, 0]}
              onChange={(angleVelocityRange) =>
                changeSystemDynamics({ angleVelocityRange })
              }
            />
          </td>
        </tr>

        <tr>
          <td colSpan={2}>
            <h4> Appearence </h4>
          </td>
        </tr>
        <tr>
          <td>
            <label> Base Alpha </label>
          </td>
          <td>
            <FloatMinMaxInput
              value={systemDynamics.baseAlphaRange ?? [1.0, 1.0]}
              onChange={(baseAlphaRange) =>
                changeSystemDynamics({ baseAlphaRange })
              }
            />
          </td>
        </tr>
        <tr>
          <td>
            <label> Size </label>
          </td>
          <td>
            <FloatMinMaxInput
              value={systemDynamics.sizeRange ?? [1.0, 1.0]}
              onChange={(sizeRange) => changeSystemDynamics({ sizeRange })}
            />
          </td>
        </tr>
        <tr>
          <td>
            <label>Fade Lifespan</label>
          </td>
          <td style={{ display: "flex", alignItems: "center" }}>
            <RangeNumberCombo
              min={0}
              max={1.0}
              scale={100}
              value={systemDynamics.fadeAfterRelativeLifespan ?? 1.0}
              onChange={(val) =>
                changeSystemDynamics({
                  fadeAfterRelativeLifespan: val,
                })
              }
            />
          </td>
        </tr>

        <tr>
          <td>
            <label> Emissive Boost </label>
          </td>

          <td>
            <input
              type="number"
              value={systemDynamics.emissiveBoost}
              onChange={(e) =>
                changeSystemDynamics({
                  emissiveBoost: parseFloat(e.target.value),
                })
              }
            />
          </td>
        </tr>

        <tr>
          <td>
            <label>Loop</label>
          </td>
          <td>
            <input
              type="checkbox"
              checked={systemDynamics.loop}
              onChange={(e) => changeSystemDynamics({ loop: e.target.checked })}
            />
          </td>
        </tr>
      </table>

      <br />
      <div className="dialog-button-group">
        <DialogButton
          onClick={() => {
            downloadTextFile(
              "particle_params.json",
              JSON.stringify({
                systemDynamics,
              })
            );
          }}
        >
          Save System
        </DialogButton>
        <DialogButton
          onClick={() => {
            systemUploadRef.current?.click();
          }}
        >
          Load System
        </DialogButton>
      </div>

      <InlineFileUpload
        ref={systemUploadRef}
        onUpload={(file) => {
          void (async () => {
            const text = await file.text();
            const obj = JSON.parse(text);
            setSystemDynamics({ ...systemDynamics, ...obj.systemDynamics });
          })();
        }}
      />
    </div>
  );
};

export const ParticleEditor: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({}) => {
  const [particleSystem, setParticleSystem] = useState<
    undefined | ParticleSystem
  >();
  const [previewParams, setPreviewParams] = useState<PreviewParams>({
    showUnitCube: false,
  });
  const basicPreviewRef = useRef<ThreeBasicObjectPreview | null>(null);

  const onAnimate = useCallback(() => {
    if (!particleSystem || !basicPreviewRef.current) {
      return;
    }

    particleSystem.tickToTime(performance.now() / 1000.0, [0, 1, 0]);
  }, [particleSystem]);

  const sceneObject = new THREE.Object3D();
  if (particleSystem) {
    sceneObject.add(particleSystem.three);
  }
  if (previewParams.showUnitCube) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const cube = new THREE.Mesh(geometry, material);
    sceneObject.add(cube);
  }

  return (
    <AdminPage>
      <div className={styles["ui-wrapper"]}>
        <div className={styles["editor"]}>
          <ParticleEditorParams
            onSystemChange={(e) => {
              if (particleSystem) {
                particleSystem.materials.dispose();
              }
              setParticleSystem(e);
            }}
            previewParams={previewParams}
            onPreviewParamsChange={(e) => {
              setPreviewParams(e);
            }}
          />
        </div>
        <div className={styles["preview-wrapper"]}>
          {particleSystem && (
            <ThreeBasicObjectPreview
              ref={basicPreviewRef}
              object={sceneObject}
              autoRotate={false}
              allowZoom={true}
              allowPan={true}
              axisLength={1}
              onAnimate={onAnimate}
            />
          )}
        </div>
      </div>
    </AdminPage>
  );
};

export default ParticleEditor;

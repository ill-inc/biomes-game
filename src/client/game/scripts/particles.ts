import type { GardenHose, GardenHoseEventOfKind } from "@/client/events/api";
import type { ClientContextSubset } from "@/client/game/context";
import type { ParticleSystemMaterials } from "@/client/game/resources/particles";
import { ParticleSystem } from "@/client/game/resources/particles";
import type { ClientResources } from "@/client/game/resources/types";
import {
  blueprintCompleteParticleMaterials1,
  blueprintCompleteParticleMaterials2,
  craftingStationCreatedParticleMaterials,
  feedFireParticleMaterials,
  feedFireSmokeParticleMaterials,
  terrainDestroyedParticleSystemMaterials,
  terrainDestroyingParticleMaterials,
} from "@/client/game/util/particles_systems";
import { isFloraId } from "@/shared/game/ids";
import {
  add,
  centerAABB,
  mul,
  scale,
  shiftAABB,
  sizeAABB,
  viewDir,
} from "@/shared/math/linear";
import type { ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { ok } from "assert";

export class ParticlesScript {
  readonly name = "particles";

  unpausedKeys: Set<string> = new Set();
  pendingKeys: Set<string> = new Set();
  prevActivatedKeyClass: Map<string, string> = new Map();
  private cleanUps: Array<() => unknown> = [];

  constructor(
    private readonly context: ClientContextSubset<"voxeloo">,
    private readonly resources: ClientResources,
    private readonly gardenHose: GardenHose
  ) {
    const listener = this.blueprintComplete.bind(this);
    this.gardenHose.on("blueprint_complete", listener);
    this.cleanUps.push(() => {
      this.gardenHose.off("blueprint_complete", listener);
    });
  }

  clear() {
    for (const c of this.cleanUps) {
      c();
    }
    this.cleanUps = [];
  }

  tick(_dt: number) {
    const particleSystemsMap = this.resources.get("/scene/particles");
    const startLength = particleSystemsMap.size;
    let hasExpired = false;

    for (const [key, system] of particleSystemsMap.entries()) {
      if (system.allAnimationsComplete()) {
        particleSystemsMap.delete(key);
        system.materials.dispose();
        hasExpired = true;
      }
    }

    this.addDestructionSystems(particleSystemsMap);
    this.addFireFeedSystems();

    if (hasExpired || startLength != particleSystemsMap.size) {
      this.resources.set("/scene/particles", particleSystemsMap);
    }
  }

  private hasExistingSystemForKey(key: string) {
    return (
      this.pendingKeys.has(key) ||
      this.resources.get("/scene/particles").has(key)
    );
  }

  private addSystemWithKey(
    key: string,
    meshPromise: Promise<ParticleSystemMaterials>,
    position?: ReadonlyVec3
  ) {
    ok(
      !this.hasExistingSystemForKey(key),
      "Tried to add a particle system with duplicate key"
    );

    this.pendingKeys.add(key);
    void meshPromise.then((m) => {
      const clock = this.resources.get("/clock");
      const particleSystemsMap = this.resources.get("/scene/particles");
      const system = new ParticleSystem(m, clock.time);
      if (position) {
        system.three.position.set(...position);
      }
      particleSystemsMap.set(key, system);
      this.pendingKeys.delete(key);
    });
  }

  private addEffect(
    keyClass: string,
    keyParam: string,
    position: ReadonlyVec3,
    material: Promise<ParticleSystemMaterials>
  ) {
    const key = `${keyClass};${keyParam}`;
    if (
      !this.hasExistingSystemForKey(key) &&
      this.prevActivatedKeyClass.get(keyClass) !== key
    ) {
      this.addSystemWithKey(key, material, position);
      this.unpausedKeys.add(key);
      this.prevActivatedKeyClass.set(keyClass, key);
    }
  }

  private addFireFeedSystems() {
    const localPlayer = this.resources.get("/scene/local_player");
    const { feedFireInfo } = localPlayer;

    // Feed fire effect
    if (feedFireInfo) {
      const keyParam = `${feedFireInfo.start}`;
      const playerViewDir = viewDir(localPlayer.player.orientation);
      this.addEffect(
        "feedf",
        keyParam,
        feedFireInfo.position,
        feedFireParticleMaterials(this.resources)
      );
      this.addEffect(
        "feedfs",
        keyParam,
        // Displace the smoke effect back a bit so it always appears
        // behind the fire.
        add(feedFireInfo.position, scale(0.01, playerViewDir)),
        feedFireSmokeParticleMaterials(this.resources)
      );
    }
  }

  private addDestructionSystems(
    particleSystemsMap: Map<string, ParticleSystem>
  ) {
    const localPlayer = this.resources.get("/scene/local_player");
    const { destroyInfo, craftingStation } = localPlayer;
    const clock = this.resources.get("/clock");
    // Terrain Destruction
    let activeDestroyingKey: string | undefined;
    if (
      destroyInfo &&
      destroyInfo.activeAction.action === "destroy" &&
      destroyInfo.terrainId &&
      destroyInfo.allowed &&
      destroyInfo.terrainSample &&
      !isFloraId(destroyInfo.terrainId)
    ) {
      if (destroyInfo.finished) {
        const finishKey = `f;${destroyInfo.start}`;
        if (!this.hasExistingSystemForKey(finishKey)) {
          this.addSystemWithKey(
            finishKey,
            terrainDestroyedParticleSystemMaterials(
              this.context,
              this.resources,
              destroyInfo.terrainSample
            ),
            add(destroyInfo.pos, [0.5, 0.5, 0.5])
          );
        }
      } else {
        activeDestroyingKey = `${destroyInfo.start}`;
        if (!this.hasExistingSystemForKey(activeDestroyingKey)) {
          this.addSystemWithKey(
            activeDestroyingKey,
            terrainDestroyingParticleMaterials(
              this.context,
              this.resources,
              destroyInfo.terrainSample,
              destroyInfo.face
            ),
            add(destroyInfo.pos, [0.5, 0.5, 0.5])
          );
          this.unpausedKeys.add(activeDestroyingKey);
        }
      }
    }

    // Crafting Station Creation
    if (craftingStation) {
      localPlayer.craftingStation = undefined;
      activeDestroyingKey = craftingStation.entityId.toString();
      if (!this.hasExistingSystemForKey(activeDestroyingKey)) {
        this.addSystemWithKey(
          activeDestroyingKey,
          craftingStationCreatedParticleMaterials([
            [0, 0, 0],
            sizeAABB(craftingStation.aabb),
          ]),
          craftingStation.aabb[0] as Vec3
        );
      }
    }

    if (this.unpausedKeys.size > 0) {
      for (const key of this.unpausedKeys) {
        if (key === activeDestroyingKey) {
          continue;
        }

        const existingSystem = particleSystemsMap.get(key);
        if (existingSystem) {
          existingSystem.pauseAt(clock.time);
          this.unpausedKeys.delete(key);
        }
      }
    }
  }

  blueprintComplete({
    aabb,
    entityId,
  }: GardenHoseEventOfKind<"blueprint_complete">) {
    const keyParam = `${entityId}`;
    const pos = centerAABB(aabb);
    const aabb0 = shiftAABB(aabb, mul(-1, pos));
    this.addEffect(
      keyParam,
      "1",
      pos,
      blueprintCompleteParticleMaterials1(aabb0)
    );
    this.addEffect(
      keyParam,
      "2",
      pos,
      blueprintCompleteParticleMaterials2(aabb0)
    );
  }
}

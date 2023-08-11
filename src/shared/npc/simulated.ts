import { applyProposedChange } from "@/shared/ecs/change";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { Emote, Health } from "@/shared/ecs/gen/components";
import { NpcMetadata, NpcState } from "@/shared/ecs/gen/components";
import type { Delta, DeltaWith } from "@/shared/ecs/gen/delta";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { AsDelta, Npc, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  UpdateNpcHealthEvent,
  UpdatePlayerHealthEvent,
  type AnyEvent,
} from "@/shared/ecs/gen/events";
import type { OptionalDamageSource } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { Vec2, Vec3 } from "@/shared/math/types";
import { idToNpcType } from "@/shared/npc/bikkie";
import { killNpc } from "@/shared/npc/modify_health";
import type { DeserializedNpcState } from "@/shared/npc/serde";
import {
  deserializeNpcCustomState,
  serializeNpcCustomState,
} from "@/shared/npc/serde";
import { TickUpdates } from "@/shared/npc/updates";
import { removeFalsyInPlace } from "@/shared/util/object";
import type { DeepReadonly } from "@/shared/util/type_helpers";

export class SimulatedNpc {
  public readonly type;
  private readonly events: AnyEvent[] = [];
  private patchableEntity: PatchableEntity;
  private deserializedNpcState: DeserializedNpcState | undefined;
  private npcStateMaybeModified = false;

  constructor(entity: Npc) {
    this.patchableEntity = new PatchableEntity(entity);
    this.type = idToNpcType(this.entity.npcMetadata().type_id);
  }

  updateFromExternal(external: ReadonlyEntity) {
    this.patchableEntity = new PatchableEntity(
      removeFalsyInPlace({
        ...this.patchableEntity.asReadonlyEntity(),
        health: external.health,
        npc_metadata: NpcMetadata.clone(external?.npc_metadata),
      }) as Npc
    );
  }

  get id(): BiomesId {
    return this.patchableEntity.id;
  }

  private get entity(): DeltaWith<keyof Npc> {
    return this.patchableEntity as Delta as DeltaWith<keyof Npc>;
  }

  // Read-only state access.
  get lockedInPlace(): boolean {
    return Boolean(this.entity.lockedInPlace());
  }

  get questGiver(): boolean {
    return Boolean(this.type.behavior.questGiver || this.entity.questGiver());
  }

  get health(): DeepReadonly<Health> {
    return this.entity.health();
  }

  get hp() {
    return this.health.hp;
  }

  get size(): DeepReadonly<Vec3> {
    return this.entity.size().v;
  }

  get position(): DeepReadonly<Vec3> {
    return this.entity.position().v;
  }

  get orientation(): DeepReadonly<Vec2> {
    return this.entity.orientation().v;
  }

  get velocity(): DeepReadonly<Vec3> {
    return this.entity.rigidBody().velocity;
  }

  get metadata(): DeepReadonly<NpcMetadata> {
    return this.entity.npcMetadata();
  }

  get label(): string {
    return this.entity.label().text;
  }

  get state(): DeepReadonly<DeserializedNpcState> {
    if (this.deserializedNpcState === undefined) {
      this.deserializedNpcState = deserializeNpcCustomState(
        this.entity.npcState()!.data
      );
    }
    return this.deserializedNpcState;
  }

  // Mutators.
  setEmote(emote: Emote) {
    this.entity.setEmote(emote);
  }

  setPosition(position: Vec3) {
    this.entity.setPosition({ v: position });
  }

  setOrientation(orientation: Vec2) {
    this.entity.setOrientation({ v: orientation });
  }

  setVelocity(velocity: Vec3) {
    this.entity.setRigidBody({ velocity });
  }

  mutableState(): DeserializedNpcState {
    this.npcStateMaybeModified = true;
    return this.state as DeserializedNpcState;
  }

  attack(target: BiomesId, damage: number) {
    log.debug(`NPC ${this.id} attacks ${target} for ${damage} damage.`);
    this.events.push(
      new UpdatePlayerHealthEvent({
        id: target,
        hpDelta: -damage,
        damageSource: {
          kind: "attack",
          attacker: this.id,
          dir: undefined,
        },
      })
    );
  }

  damage(damage: number, damageSource: OptionalDamageSource) {
    if (damage <= 0 || this.hp <= 0) {
      return;
    }
    this.events.push(
      new UpdateNpcHealthEvent({ id: this.id, hp: -damage, damageSource })
    );
  }

  kill(damageSource: OptionalDamageSource) {
    killNpc(this.entity, damageSource, secondsSinceEpoch());
  }

  finish(): TickUpdates | undefined {
    if (this.npcStateMaybeModified) {
      const serialized = serializeNpcCustomState(this.deserializedNpcState);
      if (Buffer.compare(this.entity.npcState()?.data, serialized) !== 0) {
        this.patchableEntity.setNpcState(NpcState.create({ data: serialized }));
      }
    }
    const delta = this.patchableEntity.finish() as AsDelta<Npc>;
    if (!delta && this.events.length === 0) {
      return;
    }
    if (delta) {
      this.patchableEntity = new PatchableEntity(
        applyProposedChange(this.patchableEntity.asReadonlyEntity(), {
          kind: "update",
          entity: delta,
        }) as Npc
      );
    }
    return new TickUpdates(
      delta ? [delta] : [],
      this.events.splice(0, this.events.length)
    );
  }
}

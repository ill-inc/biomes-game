import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseEventTrigger } from "@/server/shared/triggers/leaves/event";
import type { CameraMode } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zCameraPhotoStoredTriggerDefinition } from "@/shared/triggers/schema";

export class CameraPhotoTrigger extends BaseEventTrigger {
  public readonly kind = "cameraPhoto";

  constructor(
    spec: BaseStoredTriggerDefinition,
    count: number,
    public readonly mode?: CameraMode,
    public readonly people?: number,
    public readonly groups?: number,
    public readonly groupId?: BiomesId
  ) {
    super(spec, count);
  }

  override countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    return event.kind === "postPhoto" &&
      (this.mode === undefined || event.cameraMode === this.mode) &&
      (this.people === undefined || event.people >= this.people) &&
      (this.groups === undefined || event.groups >= this.groups) &&
      (this.groupId === undefined || event.groupIds.includes(this.groupId))
      ? 1
      : 0;
  }

  static deserialize(data: any): CameraPhotoTrigger {
    const spec = zCameraPhotoStoredTriggerDefinition.parse(data);
    return new CameraPhotoTrigger(
      spec,
      spec.count,
      spec.mode,
      spec.people,
      spec.groups,
      spec.groupId
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "cameraPhoto",
      count: this.count,
      mode: this.mode,
      people: this.people,
      groups: this.groups,
      groupId: this.groupId,
    };
  }
}

import type {
  AclAction,
  ReadonlyAabb,
  ReadonlyVec3f,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export interface AclPermissionInteractionError {
  kind: "acl_permission";
  action: AclAction;
  pos: ReadonlyVec3f;
  aabb?: ReadonlyAabb;
}

export interface HardnessInteractionError {
  kind: "hardness";
  hardnessClass: number;
}

export interface MessageInteractionError {
  kind: "message";
  message: string;
}

export type InteractionErrorWithoutTime =
  | AclPermissionInteractionError
  | MessageInteractionError
  | HardnessInteractionError;
export type InteractionError = InteractionErrorWithoutTime & { time: number };

export interface BaseToastMessage {
  id: string | BiomesId | number;
  time?: number;
}

export interface ChallengeToastMessage extends BaseToastMessage {
  kind: "complete" | "progress" | "new" | "basic";
  message: string;
}

export interface InteractionErrorToastMessage extends BaseToastMessage {
  kind: "interaction_error";
  error: InteractionError;
}

export type ToastMessage = ChallengeToastMessage | InteractionErrorToastMessage;

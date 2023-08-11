import type { InteractionErrorWithoutTime } from "@/client/components/toast/types";

export class AttackDestroyInteractionError extends Error {
  constructor(
    public interactionError: InteractionErrorWithoutTime,
    errorMessage?: string
  ) {
    super(errorMessage ?? interactionError.kind);
  }
}
export class AttackDestroyInteractionErrorMessage extends AttackDestroyInteractionError {
  constructor(message: string) {
    super(
      {
        kind: "message",
        message,
      },
      message
    );
  }
}

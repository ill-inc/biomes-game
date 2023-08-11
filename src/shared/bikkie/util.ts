export type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

export const VALID_BISCUIT_NAME = /^[a-z][a-zA-Z0-9]+$/;

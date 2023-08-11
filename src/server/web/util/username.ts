import { randomString } from "@/shared/util/helpers";

export function generateInitialUsername() {
  return `NewPlayer${randomString(4).toUpperCase()}`;
}

export function isInitialUsername(name: string) {
  return name.startsWith("NewPlayer");
}

import type { EarlyClientContext } from "@/client/game/context";
import { logout } from "@/client/util/auth";
import type { SelfProfileResponse } from "@/pages/api/social/self_profile";

import type { SpecialRoles } from "@/shared/acl_types";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { evaluateRole } from "@/shared/roles";
import { fireAndForget } from "@/shared/util/async";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { ok } from "assert";

export class BiomesUser {
  constructor(
    public readonly id: BiomesId,
    public readonly createMs: number | undefined,
    private specialRoles: ReadonlySet<SpecialRoles>
  ) {}

  hasSpecialRole(...requiredRoles: SpecialRoles[]) {
    return evaluateRole(this.specialRoles, ...requiredRoles);
  }

  updateSpecialRoles(newRoles: ReadonlySet<SpecialRoles>) {
    this.specialRoles = newRoles;
  }
}

export class AuthManager {
  constructor(public readonly currentUser: BiomesUser) {}

  private static async fetchUserProfile(userId: BiomesId): Promise<BiomesUser> {
    if (!userId) {
      return new BiomesUser(INVALID_BIOMES_ID, undefined, new Set());
    }
    const profile: SelfProfileResponse = await asyncBackoffOnAllErrors(
      async () => {
        try {
          return await jsonFetch<SelfProfileResponse>(
            "/api/social/self_profile"
          );
        } catch (error) {
          log.error("Error fetching self profile, retrying", { error });
          throw error;
        }
      },
      {
        baseMs: 1000,
        exponent: 1.25,
        maxMs: 10000,
      }
    );
    ok(userId === profile.user.id, "User ID mismatch");
    return new BiomesUser(
      profile.user.id,
      profile.user.createMs,
      new Set(profile.roles)
    );
  }

  static async bootstrap(userId: BiomesId): Promise<AuthManager> {
    return new AuthManager(await this.fetchUserProfile(userId));
  }

  static logout() {
    fireAndForget(
      logout().then(() => {
        setTimeout(() => {
          location.href = "/";
        }, 100);
      })
    );
  }
}

export async function loadAuthManager<C extends EarlyClientContext>(
  loader: RegistryLoader<C>
) {
  return AuthManager.bootstrap(await loader.get("userId"));
}

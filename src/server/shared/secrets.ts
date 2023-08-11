import { log } from "@/shared/logging";
import { predictableId } from "@/shared/util/auto_id";
import type { JSONable } from "@/shared/util/type_helpers";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { ok } from "assert";
import { entries, keys, zip } from "lodash";

function Secret<T>() {
  return null as unknown as T;
}

const ALL_SECRETS = {
  "biomes-discord-bot-token": Secret<string>(),
  "biomesbob-client-secret": Secret<string>(),
  "biomesbob-private-key": Secret<string>(),
  "discord-biomes-alpha-webhook": Secret<string>(),
  "discord-camera-webhook-url": Secret<string>(),
  "discord-deploy-webhook-url": Secret<string>(),
  "discord-new-users-webhook-url": Secret<string>(),
  "discord-oauth-client-secret": Secret<string>(),
  "discord-review-webhook-url": Secret<string>(),
  "discord-social-webhook-url": Secret<string>(),
  "discord-test-webhook-url": Secret<string>(),
  "discord-user-report-webhook-url": Secret<string>(),
  "elevenlabs-api-key": Secret<string>(),
  "foreign-auth-state": Secret<string>(),
  "game-action-permission-token-secret": Secret<string>(),
  "github-mossy-mucker-personal-access-token": Secret<string>(),
  "google-oauth-client-secret": Secret<string>(),
  "ill-alchemy-api-key": Secret<string>(),
  "internal-auth-token": Secret<string>(),
  "linear-api-key": Secret<string>(),
  "openai-api-key": Secret<string>(),
  "postmark-auth-transactional": Secret<string>(),
  "splash-recaptcha-server-secret": Secret<string>(),
  "twitter-oauth-client-secret": Secret<string>(),
  "twitch-oauth-client-secret": Secret<string>(),
  "untrusted-apply-token": Secret<string>(),
} as const;

export type SecretKey = keyof typeof ALL_SECRETS;
type SecretVal<T extends SecretKey> = (typeof ALL_SECRETS)[T];
type SecretMap = { [K in SecretKey]: SecretVal<K> };

export class Secrets {
  private readonly secretMap: SecretMap;

  constructor(secretMap: SecretMap) {
    this.secretMap = secretMap;
  }

  get<T extends SecretKey>(secret: T): SecretVal<T> {
    return this.secretMap[secret] as SecretVal<T>;
  }
}

async function readJSONOrStringSecret(
  client: SecretManagerServiceClient,
  secretName: string,
  version = "latest"
): Promise<JSONable> {
  const name = `projects/${
    process.env.GOOGLE_CLOUD_PROJECT || "zones-cloud"
  }/secrets/${secretName}/versions/${version}`;
  const [accessResponse] = await client.accessSecretVersion({ name });

  if (!accessResponse.payload || !accessResponse.payload.data) {
    throw new Error(`Missing secret '${secretName}`);
  }

  const stringResult = accessResponse.payload.data.toString();
  try {
    return JSON.parse(stringResult) as JSONable;
  } catch (error) {
    return stringResult;
  }
}

async function loadSecretsFromGoogle() {
  let results!: JSONable[];
  try {
    const client = new SecretManagerServiceClient();

    results = await Promise.all(
      entries(ALL_SECRETS).map(([name, _entryVal]) =>
        readJSONOrStringSecret(client, name)
      )
    );
  } catch (error) {
    log.error("Cannot connect to Google Secrets", { error });
    throw error; // Fatal in production.
  }

  const secretMap: Record<string, any> = {};
  zip(keys(ALL_SECRETS), results).forEach(([secretName, secretVal]) => {
    secretMap[secretName! as SecretKey] = secretVal!;
  });

  return new Secrets(secretMap as SecretMap);
}

async function prepareLocalDevSecrets(...additionalSecretsNeeded: SecretKey[]) {
  const secretMap = createRandomSecretMap("local-dev");
  if (additionalSecretsNeeded.length > 0) {
    try {
      const client = new SecretManagerServiceClient();
      const neededSecrets = [...additionalSecretsNeeded];
      const results = await Promise.all(
        neededSecrets.map((name) => readJSONOrStringSecret(client, name))
      );
      ok(results.length === neededSecrets.length);
      zip(neededSecrets, results).forEach(([secretName, secretVal]) => {
        (secretMap as any)[secretName!] = secretVal!;
      });
    } catch (error) {
      log.warn(
        "Cannot connect to Google secrets, local dev might have trouble connecting to prod",
        {
          error,
        }
      );
    }
  }
  return new Secrets(secretMap);
}

export async function bootstrapGlobalSecrets(
  ...additionalSecretsNeeded: SecretKey[]
) {
  if ((global as any)._global_secrets) {
    return; // already set
  }
  (global as any)._global_secrets =
    process.env.NODE_ENV === "production" ||
    process.env.USE_PRODUCTION_SECRETS === "1"
      ? await loadSecretsFromGoogle()
      : await prepareLocalDevSecrets(...additionalSecretsNeeded);
}

export function getGlobalSecrets() {
  const secrets = (global as any)._global_secrets as Secrets;
  ok(secrets);
  return secrets;
}

export function getSecret<T extends SecretKey>(t: T) {
  return getGlobalSecrets().get(t);
}

// We use this index so that even with a common seed the generated
// secrets differ.
let randomSecretIndex = 1;

function createRandomSymmetricKey(_seed?: string) {
  // TODO: Generate a seed-derived random symmetric key.
  return "ivOB9+jNVDek9emP4G/xCGD12trNefpGek/+9vurIYg=";
}

function createRandomKey(seed?: string, targetLength?: number) {
  return predictableId(`${seed}${randomSecretIndex++}`, targetLength);
}

function createRandomUrl(seed?: string) {
  return `http://localhost/#${createRandomKey(seed)}`;
}

function createRandomSecretMap(seed?: string): SecretMap {
  return {
    "biomes-discord-bot-token": createRandomKey(seed),
    "biomesbob-client-secret": createRandomKey(seed),
    "biomesbob-private-key": createRandomSymmetricKey(seed),
    "discord-biomes-alpha-webhook": createRandomUrl(seed),
    "discord-camera-webhook-url": createRandomUrl(seed),
    "discord-deploy-webhook-url": createRandomUrl(seed),
    "discord-new-users-webhook-url": createRandomUrl(seed),
    "discord-oauth-client-secret": createRandomKey(seed),
    "discord-review-webhook-url": createRandomUrl(seed),
    "discord-social-webhook-url": createRandomUrl(seed),
    "discord-test-webhook-url": createRandomUrl(seed),
    "discord-user-report-webhook-url": createRandomUrl(seed),
    "elevenlabs-api-key": "",
    "foreign-auth-state": createRandomKey(seed),
    "game-action-permission-token-secret": createRandomKey(seed),
    "github-mossy-mucker-personal-access-token": createRandomSymmetricKey(seed),
    "google-oauth-client-secret": createRandomKey(seed),
    "ill-alchemy-api-key": createRandomKey(seed),
    "internal-auth-token": createRandomKey(seed),
    "linear-api-key": createRandomKey(seed),
    "openai-api-key": "",
    "postmark-auth-transactional": createRandomKey(seed),
    "splash-recaptcha-server-secret": createRandomKey(seed),
    "twitter-oauth-client-secret": createRandomKey(seed),
    "twitch-oauth-client-secret": createRandomKey(seed),
    "untrusted-apply-token": createRandomKey(seed),
  };
}

export function createRandomSecrets(seed?: string): Secrets {
  return new Secrets(createRandomSecretMap(seed));
}

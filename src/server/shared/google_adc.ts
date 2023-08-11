import { log } from "@/shared/logging";
import { tryAny } from "@/shared/util/collections";
import { exec } from "child-process-promise";
import { constants } from "fs";
import { access } from "fs/promises";
import path from "path";

async function adcExists(configPath: string) {
  try {
    await access(
      path.join(configPath, "application_default_credentials.json"),
      constants.R_OK
    );
    return true;
  } catch (error: any) {
    return false;
  }
}

let cachedConfig: any | undefined;

async function getGCloudConfig() {
  if (!cachedConfig) {
    try {
      const { stdout } = await exec("gcloud info --format json");
      cachedConfig = JSON.parse(stdout) as unknown;
    } catch (e) {
      log.fatal(
        "Could not load gcloud config, have you installed the 'gcloud' CLI?"
      );
      cachedConfig = {};
    }
  }
  return cachedConfig;
}

async function checkGCloudConfigForAdc() {
  const gcloudConfig = await getGCloudConfig();
  const configDir =
    gcloudConfig.config?.paths?.global_config_dir ?? ("" as string);
  if (!configDir) {
    return false;
  }
  return adcExists(configDir);
}

export async function getGCloudAccount() {
  const gcloudConfig = await getGCloudConfig();
  const account = gcloudConfig.config?.account;
  if (!account || typeof account !== "string") {
    throw new Error(
      "Could not find gcloud account, have you run: gcloud auth login?"
    );
  }
  return account;
}

export async function checkApplicationDefaultCredentialsAvailable() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // User specified them in the environment.
    return true;
  }
  // Check a variety of options simultaneously.
  if (
    !(await tryAny(
      adcExists(path.join(process.env.HOME ?? "", ".config/gcloud")),
      adcExists("%APPDATA%/gcloud"),
      checkGCloudConfigForAdc()
    ))
  ) {
    log.error("Google Application Default Credentials not available!");
    log.fatal("Please run: gcloud auth application-default login");
    return false;
  }
  return true;
}

import { bootstrapGlobalConfig } from "@/server/shared/config";
import { createRandomSecrets } from "@/server/shared/secrets";
import dotenv from "dotenv";

export async function serverTestInit() {
  dotenv.config();
  (global as any)._global_secrets = createRandomSecrets("test-secrets");
  bootstrapGlobalConfig();
}

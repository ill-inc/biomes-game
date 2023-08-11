import { serverTestInit } from "@/server/test/init";
import { prepareBikkieForTest } from "@/shared/bikkie/test_helpers";
import { log } from "@/shared/logging";
import { register } from "prom-client";
import sinon from "sinon";

declare global {
  // eslint-disable-next-line no-var
  var __serverBootstraped: boolean | undefined;
}

export async function mochaGlobalSetup() {
  register.clear(); // So we don't get dupe metrics
  prepareBikkieForTest();
  if (!global.__serverBootstraped) {
    log.info("Bootstrapping tests");
    await serverTestInit();
    global.__serverBootstraped = true;
  }
}

export const mochaHooks = (): Mocha.RootHookObject => {
  return {
    beforeAll: () => mochaGlobalSetup(),
    afterEach: () => sinon.restore(),
  };
};

import { fetchEnvironmentGroupBundleById } from "@/server/web/db/environment_groups";
import { okOrAPIError } from "@/server/web/errors";
import {
  biomesApiHandler,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import { zEnvironmentGroupBundle } from "@/shared/types";
import { z } from "zod";

export const zGroupById = z.object({
  id: zQueryBiomesId,
});

export default biomesApiHandler(
  {
    auth: "required",
    query: zGroupById,
    response: zEnvironmentGroupBundle,
  },
  async ({ context: { db, worldApi }, query: { id } }) => {
    const ret = await fetchEnvironmentGroupBundleById(db, worldApi, id);
    okOrAPIError(ret, "not_found", `Group ${id} not found.`);
    return ret;
  }
);

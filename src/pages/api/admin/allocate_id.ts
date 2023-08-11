import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";

export default biomesApiHandler(
  {
    auth: "admin",
    response: zBiomesId,
  },
  async ({ context: { idGenerator } }) => {
    return idGenerator.next();
  }
);

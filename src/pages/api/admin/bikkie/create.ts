import {
  zCreateBiscuitRequest,
  zCreateBiscuitResponse,
} from "@/client/components/admin/bikkie/requests";
import { biomesApiHandler } from "@/server/web/util/api_middleware";

export default biomesApiHandler(
  {
    auth: "admin",
    body: zCreateBiscuitRequest,
    response: zCreateBiscuitResponse,
    zrpc: true,
  },
  async ({ context: { bakery, idGenerator }, body: { proposedName } }) => {
    const names = await bakery.allNames();

    // Choose a correct name.
    proposedName ??= "newBiscuit";
    const allNames = new Set<string>(names.map(([, n]) => n));
    let idx = 2;
    let name = proposedName;
    while (allNames.has(name)) {
      name = `${proposedName}${idx++}`;
    }

    // Allocate an ID
    const id = await idGenerator.next();
    return { name, id };
  }
);

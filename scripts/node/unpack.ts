import { makeJsonSafe } from "@/shared/json";
import { unpack } from "msgpackr";
import { render } from "prettyjson";

const encoded = (process.argv[2] ?? "").trim();
console.log(render({ encoded }));
console.log(render(makeJsonSafe(unpack(Buffer.from(encoded, "base64")))));

import { connectToK8, getServiceEndpoints } from "@/server/shared/k8";
import { render } from "prettyjson";

async function main(name: string) {
  console.log(
    render(Array.from(await getServiceEndpoints(connectToK8(), name)))
  );
}

const [name] = process.argv.slice(2);
main(name);

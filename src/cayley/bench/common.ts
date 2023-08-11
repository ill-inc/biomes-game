import type { Event } from "benchmark";
import { Suite } from "benchmark";
import chalk from "chalk";

export function runSuite(name: string, tests: Record<string, () => void>) {
  const suite = new Suite("Fill");
  for (const [name, test] of Object.entries(tests)) {
    suite.add(name, test);
  }
  suite
    .on("start", () => {
      console.log(chalk.green(`Running suite "${name}"...`));
    })
    .on("cycle", (event: Event) => {
      console.log(`\t${event.target}`);
    })
    .on("complete", () => {
      const fastest = chalk.cyan(`${suite.filter("fastest").map("name")}`);
      console.log(`\tFastest is ${fastest} \n`);
    })
    .run();
}

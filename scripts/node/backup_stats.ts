import { getBackupStatsFromFile } from "@/server/backup/stats";
import { EntityStats } from "@/shared/stats";
import { ok } from "assert";

function printDiffRow(key: string, from: number, to: number, diff: number) {
  console.log(`${key}: ${from} -> ${to} (${diff})`);
}

function printDiffStats(from: EntityStats, to: EntityStats) {
  const diffStats = from.diff(to);

  printDiffRow(
    "Total file size",
    from.totalFileSize,
    to.totalFileSize,
    diffStats.totalFileSize
  );

  printDiffRow(
    "Total entities",
    from.totalEntities,
    to.totalEntities,
    diffStats.totalEntities
  );
  printDiffRow(
    "Total components",
    from.totalComponents,
    to.totalComponents,
    diffStats.totalComponents
  );
  console.log();

  const sortedDiffComps = Array.from(
    diffStats.componentStatistics.entries()
  ).sort((a, b) => b[1].size - a[1].size);
  for (const [key, diffComp] of sortedDiffComps) {
    console.log(key);
    const diffFrom = from.componentStatistics.get(key);
    const diffTo = to.componentStatistics.get(key);
    printDiffRow(
      "  count",
      diffFrom?.count ?? 0,
      diffTo?.count ?? 0,
      diffComp.count
    );
    printDiffRow(
      "  size",
      diffFrom?.size ?? 0,
      diffTo?.size ?? 0,
      diffComp.size
    );
  }
}

async function main() {
  const from = process.argv.length > 2 ? process.argv[2] : undefined;
  const to = process.argv.length > 3 ? process.argv[3] : undefined;

  ok(from, "Expected either one or two (for a diff) backup files as arguments");

  if (!to) {
    console.log(`Reading backup file: ${from}`);
    const stats = await getBackupStatsFromFile(from);
    console.log(stats);
  } else {
    const [statsFrom, statsTo] = await Promise.all(
      [from, to].map((x) => {
        console.log(`Reading backup file: ${x}`);
        return getBackupStatsFromFile(x);
      })
    );

    printDiffStats(statsFrom, statsTo);
  }
}

main();

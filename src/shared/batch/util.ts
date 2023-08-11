import { createInterface } from "readline";

export function* batchAsync<T>(transactions: T[], size: number) {
  const batch: T[] = [];
  for (const transaction of transactions) {
    batch.push(transaction);
    if (batch.length >= size) {
      yield batch;
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    yield batch;
  }
}

export async function promptToContinue(
  msg: string = "Press any key to continue..."
) {
  process.stdout.write(msg);
  return new Promise<void>((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(msg, () => {
      rl.close();
      resolve();
    });
  });
}

import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

export function write(outputPath: string, data: Buffer | string) {
  const dirPath = dirname(outputPath);
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(outputPath, data);
  console.log(`Published "${outputPath}"...`);
}

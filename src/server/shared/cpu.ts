import * as os from "os";

export function numCpus() {
  if (process.env.CPU_COUNT) {
    return parseInt(process.env.CPU_COUNT ?? "") || 1;
  }
  return os.cpus().length;
}

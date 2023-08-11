export function buildTimestamp() {
  return parseInt(process.env.BUILD_TIMESTAMP ?? "0");
}

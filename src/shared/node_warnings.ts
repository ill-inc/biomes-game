export function disableExperimentalWarnings() {
  // NodeJS nicely warns us that the Fetch API is experimental, but it's
  // annoying; so disable that warning entirely.
  // Note, the type generalization is needed here to avoid a verbose long series
  // of overloads. We basically passthrough all arguments.
  const originalEmit = process.emit.bind(process) as (...args: any[]) => any;
  process.emit = function (name, data: any, ...args: any[]) {
    if (
      name === `warning` &&
      typeof data === `object` &&
      data?.name === `ExperimentalWarning` &&
      typeof data?.message === "string" &&
      data?.message.includes(`Fetch API`)
    ) {
      return false;
    }
    return originalEmit(name, data, ...args);
  } as typeof process.emit;
}

import { ok } from "assert";
import type { ArgumentConfig } from "ts-command-line-args";
import { parse } from "ts-command-line-args";

export function stringLiteralCtor<T extends string[]>(...types: T) {
  return (value: any) => {
    ok(types.includes(value), `Invalid value for string literal: ${value}`);
    return String(value) as T[number];
  };
}

export function parseArgs<T extends Record<string, any>>(
  config: ArgumentConfig<T>
) {
  return parse(Object.assign(config, { help: { type: Boolean } }), {
    // Bit odd, but the ts-command-line-args library needs a constant-type for T
    // and it doesn't infer that correctly after the assign above.
    helpArg: "help" as any,
    showHelpWhenArgsMissing: true,
  });
}

// Manually written, minimal set for API used, feel free to add more
declare module "@observablehq/runtime" {
  export class Runtime {
    constructor();

    module(notebook: Notebook, fn: (name: string) => any): Module;
  }

  export class Module {
    redefine(field: string, val: any): void;
  }

  export type Notebook = object;
}

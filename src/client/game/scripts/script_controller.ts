import { timeCode } from "@/shared/metrics/performance_timing";

export interface Script {
  readonly name: string;
  tick: (dt: number) => void;
  clear?: () => void;
}

export class ScriptController implements Script {
  readonly name = "scriptController";
  constructor(private readonly scripts: Script[]) {}

  reassign(scripts: Script[]) {
    this.clear();
    this.scripts.push(...scripts);
  }

  clear() {
    for (const script of this.scripts) {
      script.clear?.();
    }
    this.scripts.length = 0;
  }

  tick(dt: number, timingPrefix: string = "scripts") {
    this.scripts.forEach((script) =>
      timeCode(`${timingPrefix}:${script.name}`, () => script.tick(dt))
    );
  }
}

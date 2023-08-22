import * as Component from "@/shared/ecs/gen/components";
import { snakeCaseToUpperCamalCase } from "@/shared/util/text";
import { ok } from "assert";

export function componentGet(component: any, path: string[]): any {
  let current = component;
  for (const key of path) {
    if (current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

export function componentUpdate(component: any, path: string[], newValue: any) {
  let current = component;
  for (let i = 0; i < path.length - 1; ++i) {
    current = component[path[i]];
    ok(current !== undefined);
  }
  current[path[path.length - 1]] = newValue;
}

export function createComponentFromFieldName(field: string): any {
  return Component[snakeCaseToUpperCamalCase(field) as unknown as keyof Component].create();
}

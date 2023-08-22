import * as Component from "@/shared/ecs/gen/components";
import { snakeCaseToUpperCamalCase } from "@/shared/util/text";
import { ok } from "assert";

// Access a field of a component given the path of the field.
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

// Update a field of a component given the path of the field and the new value.
// Throws if the path is invalid.
export function componentUpdate(component: any, path: string[], newValue: any) {
  let current = component;
  for (let i = 0; i < path.length - 1; ++i) {
    current = component[path[i]];
    ok(current !== undefined);
  }
  current[path[path.length - 1]] = newValue;
}

// Creates a default component given the name of the component's field.
// e.g. "health" -> Component.Health.create()
export function createComponentFromFieldName(field: string): any {
  return (Component as any)[snakeCaseToUpperCamalCase(field)].create();
}

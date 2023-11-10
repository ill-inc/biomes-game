import type { Delta } from "@/shared/ecs/gen/delta";
import {
  snakeCaseToCamalCase,
  snakeCaseToUpperCamalCase,
} from "@/shared/util/text";

type EntityField = keyof Delta;
type EntityMethod = "get" | "mutable" | "set" | "clear";

function entityFunc(field: string, method: EntityMethod): EntityField {
  if (method === "get") {
    return snakeCaseToCamalCase(field) as EntityField;
  }
  const componentName = snakeCaseToUpperCamalCase(field);
  return `${method}${componentName}` as EntityField;
}

export function entityGet(
  entity: Delta,
  field: string,
  method: EntityMethod
): any {
  return entity[entityFunc(field, method)];
}

export function entityInvoke(
  entity: Delta,
  field: string,
  method: "get" | "mutable" | "set" | "clear",
  ...args: any[]
): any {
  if (entity[entityFunc(field, method)] === undefined) {
    return undefined;
  }
  return (entity[entityFunc(field, method)] as any)(...args);
}

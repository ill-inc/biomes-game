import { Delta } from "@/shared/ecs/gen/delta";

type EntityField = keyof Delta;
type EntityMethod = "get" | "mutable" | "set" | "clear";

function snakeCaseToUpperCamalCase(field: string): string {
  return field
    .split("_")
    .map((name) => name[0].toUpperCase() + name.slice(1))
    .join("");
}

function snakeCaseToCamalCase(field: string): string {
  const words = field.split("_");
  return (
    words[0] +
    words
      .slice(1)
      .map((name) => name[0].toUpperCase() + name.slice(1))
      .join("")
  );
}

function entityFunc(field: string, method: EntityMethod): EntityField {
  if (method === "get") {
    return snakeCaseToCamalCase(field) as EntityField;
  }
  const componentName = snakeCaseToUpperCamalCase(field);
  return `${method}${componentName}` as EntityField;
}

export function entityGet(entity: Delta, field: string, method: EntityMethod): any {
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

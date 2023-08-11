import { uncamelCase } from "@/client/util/text_helpers";
import type { AnyBikkieAttribute } from "@/shared/bikkie/attributes";

export function nameForAttribute(attribute: AnyBikkieAttribute) {
  return attribute.niceName ?? uncamelCase(attribute.name);
}

export function prettySchemaName(string?: string) {
  return String(string).replace(/^\//, "").replaceAll(/\//g, " › ");
}

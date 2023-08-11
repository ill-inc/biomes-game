import type { BiomesId } from "@/shared/ids";
import { jsonPostNoBody } from "@/shared/util/fetch_helpers";
import { ok } from "assert";
import { isFunction } from "lodash";
import * as z from "zod";
import { ZodDefault } from "zod";

export const asyncDefaultSymbol = Symbol.for("biomesAsyncDefault");

export type AsyncDefaultContext = {
  generateId: () => Promise<BiomesId>;
};

export type AsyncDefaultFn<T> = (context: AsyncDefaultContext) => Promise<T>;
export type AsyncDefault<T> = AsyncDefaultFn<T> | Promise<T> | T;

export function withAsyncDefault<T extends z.ZodTypeAny>(
  zod: T,
  asyncDefault: AsyncDefault<z.infer<T>>
): T {
  return zod.annotate(asyncDefaultSymbol, asyncDefault);
}

export function canCreateDefault<T extends z.ZodTypeAny>(zod: T): boolean {
  zod = unwrappedSchema(zod, true);
  return (
    zod.annotations?.[asyncDefaultSymbol] !== undefined ||
    zod instanceof ZodDefault
  );
}

export async function createDefault<T extends z.ZodTypeAny>(
  context: AsyncDefaultContext | undefined,
  zod: T
): Promise<z.infer<T>> {
  const asyncDefaultFn = zod.annotations?.[asyncDefaultSymbol] as
    | AsyncDefault<z.infer<T>>
    | undefined;
  if (asyncDefaultFn !== undefined) {
    if (isFunction(asyncDefaultFn)) {
      ok(context, "Cannot create async default without context!");
      return asyncDefaultFn(context);
    } else {
      return asyncDefaultFn;
    }
  }
  zod = unwrappedSchema(zod, true);
  const zodDefault =
    zod instanceof ZodDefault ? zod._def.defaultValue : undefined;
  if (!zodDefault) {
    throw new Error("Cannot create default for type!");
  }
  return zodDefault();
}

export function createAsyncDefaultContext(): AsyncDefaultContext {
  return {
    generateId: () => jsonPostNoBody<BiomesId>("/api/admin/allocate_id"),
  };
}

export function unwrappedSchema<S extends z.ZodTypeAny>(
  schema: S,
  notDefault?: boolean
) {
  let unwrapped = schema;

  while (true) {
    if (unwrapped instanceof z.ZodLazy) {
      unwrapped = unwrapped.schema;
    } else if (unwrapped instanceof z.ZodOptional) {
      unwrapped = unwrapped.unwrap();
    } else if (unwrapped instanceof z.ZodEffects) {
      unwrapped = unwrapped.innerType();
    } else if (!notDefault && unwrapped instanceof z.ZodDefault) {
      unwrapped = unwrapped._def.innerType;
    } else {
      return unwrapped;
    }
  }
}

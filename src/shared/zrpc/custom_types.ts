import { serializeError } from "serialize-error";
import type { ZodAny, ZodTypeAny } from "zod";
import { z, ZodIssueCode } from "zod";

export type CustomSerializedType<T> = T & {
  prepareForZrpc: () => any;
};

export function makeZodType<T, TBase extends ZodTypeAny = ZodAny>(
  deserialize: (val: z.infer<TBase>) => T,
  base?: TBase
) {
  return (base ?? z.any()).transform<T>((val, ctx) => {
    try {
      return deserialize(val);
    } catch (error) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: serializeError(error).message,
        fatal: true,
      });
    }
    // The below value is unused due to the failure, but needed to keep
    // the return type happy.
    return undefined as unknown as T;
  });
}

export function makeAsyncZodType<T, TBase extends ZodTypeAny = ZodAny>(
  deserialize: (val: z.infer<TBase>) => Promise<T>,
  base?: TBase
) {
  return (base ?? z.any()).transform<T>(async (val, ctx) => {
    try {
      return await deserialize(val);
    } catch (error) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: serializeError(error).message,
        fatal: true,
      });
    }
    // The below value is unused due to the failure, but needed to keep
    // the return type happy.
    return undefined as unknown as T;
  });
}

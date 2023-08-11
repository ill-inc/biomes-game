import type { AuthedToken } from "@/server/shared/auth/cookies";
import type { WebServerContext } from "@/server/web/context";
import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import type { z, ZodTypeAny } from "zod";

export type TypedEndpointConfig<TZodQuery extends ZodTypeAny> = {
  auth: "admin" | "required" | "optional" | "developer_api";
  query?: TZodQuery;
};

export type AnyTypedEndpointConfig = TypedEndpointConfig<ZodTypeAny>;

export type InferInput<T> = T extends ZodTypeAny ? z.infer<T> : never;

export type TypedRequest<TConfig extends AnyTypedEndpointConfig> = {
  config: TConfig;
  context: WebServerContext;
  auth: TConfig["auth"] extends "optional"
    ? AuthedToken | undefined
    : AuthedToken;
  query: InferInput<TConfig["query"]>;
};

export function parseOrApiError<T extends ZodTypeAny>(schema: T, value: any) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      log.error("Error during parse", { error });
    }
    throw new APIError("bad_param", `Invalid parameter: ${error}`);
  }
}

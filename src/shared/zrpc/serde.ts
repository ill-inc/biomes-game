import { isBinaryData } from "@/shared/util/binary";
import { RpcError } from "@/shared/zrpc/errors";
import * as grpc from "@/shared/zrpc/grpc";
import { mapValues } from "lodash";
import { FLOAT32_OPTIONS, Packr } from "msgpackr";
import { render } from "prettyjson";
import type { ZodTypeAny, z } from "zod";

export type NotAPromise<T> = T extends PromiseLike<infer _U> ? never : T;

// Due to NextJS multiply importing modules, we cannot rely on the type-checks
// in msgpackr to correctly handle extension types. As such we instead do our
// own recursive prepare looking for a prepareForZrpc method and applying it
// wherever possible.
export function prepare(data: any): unknown {
  if (data && typeof data === "object") {
    if (data.prepareForZrpc !== undefined) {
      const interim = data.prepareForZrpc();
      return prepare(interim); // Call it again to handle nested types.
    } else if (data.constructor === Array) {
      return data.map((value) => prepare(value));
    } else if (data.constructor === Map) {
      return new Map(
        Array.from(data.entries(), ([key, value]) => [
          prepare(key),
          prepare(value),
        ])
      );
    } else if (data.constructor === Set) {
      return new Set(Array.from(data.values(), (value) => prepare(value)));
    } else if (isBinaryData(data)) {
      return data;
    } else {
      return mapValues(data, prepare);
    }
  } else {
    return data;
  }
}

const packr = new Packr({
  useRecords: true,
  moreTypes: true,
  bundleStrings: true,
  useFloat32: FLOAT32_OPTIONS.NEVER,
});

// Do not use for encoding at-rest, only in-flight.
export function zrpcSerialize<T>(data: NotAPromise<T>): Buffer {
  try {
    return packr.pack(prepare(data));
  } catch (error) {
    throw new RpcError(
      grpc.status.INVALID_ARGUMENT,
      `Could not serialize: ${error}`
    );
  }
}

// Do not use for encoding at-rest, only in-flight.
export function zrpcDeserialize<T extends ZodTypeAny>(
  bytes: Buffer | Uint8Array,
  schema: T
): z.infer<T> {
  const unpacked = (() => {
    try {
      return packr.unpack(bytes);
    } catch (error) {
      throw new RpcError(
        grpc.status.INVALID_ARGUMENT,
        `Could not decode: ${error}`
      );
    }
  })();
  try {
    return schema.parse(unpacked);
  } catch (error) {
    throw new RpcError(
      grpc.status.INVALID_ARGUMENT,
      `Could not deserialize: ${render({
        error,
      })}`
    );
  }
}

// Do not use for encoding at-rest, only in-flight.
export function zrpcWebSerialize<T>(data: NotAPromise<T>) {
  return zrpcSerialize(data).toString("base64");
}

// Do not use for encoding at-rest, only in-flight.
export function zrpcWebDeserialize<T extends ZodTypeAny>(
  data: string,
  schema: T
): z.infer<T> {
  return zrpcDeserialize(Buffer.from(data, "base64"), schema);
}

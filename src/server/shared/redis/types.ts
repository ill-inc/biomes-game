import type Redis from "ioredis";
import type { Callback, RedisKey, RedisValue, Result } from "ioredis";

export type Context = { type: "default" };
// Add some types that upstream is missing.

export type OverrideTypes<A, B> = Omit<A, keyof B & keyof A> & B;

export type BiomesRedisConnection = OverrideTypes<
  Redis,
  {
    // Custom for Biomes quit/disconnect with reasons.
    quit(reason: string): Promise<unknown>;
    disconnect(reason: string): void;

    // xinfo
    xinfo(
      subcommand: "CONSUMERS",
      key: RedisKey,
      groupname: string | Buffer
    ): Result<string[][], Context>;

    xpending(key: RedisKey, group: string | Buffer): Result<[string], Context>;

    // xautoclaimBuffer
    xautoclaimBuffer(
      key: RedisKey,
      group: string | Buffer,
      consumer: string | Buffer,
      minIdleTime: string | Buffer | number,
      start: string | Buffer | number,
      callback?: Callback<
        [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]]
      >
    ): Result<
      [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]],
      Context
    >;
    xautoclaimBuffer(
      key: RedisKey,
      group: string | Buffer,
      consumer: string | Buffer,
      minIdleTime: string | Buffer | number,
      start: string | Buffer | number,
      justid: "JUSTID",
      callback?: Callback<
        [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]]
      >
    ): Result<
      [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]],
      Context
    >;
    xautoclaimBuffer(
      key: RedisKey,
      group: string | Buffer,
      consumer: string | Buffer,
      minIdleTime: string | Buffer | number,
      start: string | Buffer | number,
      countToken: "COUNT",
      count: number | string,
      callback?: Callback<
        [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]]
      >
    ): Result<
      [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]],
      Context
    >;
    xautoclaimBuffer(
      key: RedisKey,
      group: string | Buffer,
      consumer: string | Buffer,
      minIdleTime: string | Buffer | number,
      start: string | Buffer | number,
      countToken: "COUNT",
      count: number | string,
      justid: "JUSTID",
      callback?: Callback<
        [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]]
      >
    ): Result<
      [id: Buffer, messages: [id: Buffer, fields: Buffer[]][]],
      Context
    >;

    // xreadgroupBuffer
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[],
        callback: Callback<
          null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][]
        >
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
    xreadgroupBuffer(
      ...args: [
        groupConsumerToken: "GROUP",
        group: string | Buffer,
        consumer: string | Buffer,
        countToken: "COUNT",
        count: number | string,
        millisecondsToken: "BLOCK",
        milliseconds: number | string,
        noack: "NOACK",
        streamsToken: "STREAMS",
        ...args: RedisValue[]
      ]
    ): Result<
      null | [key: Buffer, entries: [id: Buffer, fields: Buffer[]][]][],
      Context
    >;
  }
>;

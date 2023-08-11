import type { ProposedChange } from "@/shared/ecs/change";
import { zChange, zProposedChange } from "@/shared/ecs/zod";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { zFirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { ZodType } from "zod";
import { z } from "zod";

export type Iff =
  | [BiomesId]
  | [BiomesId, number?]
  | [BiomesId, number, ...number[]];

export const zIff = z.union([
  z.tuple([zBiomesId]),
  // Assert entity and all components are at-or-before tick
  // Example [ID, 1234]
  z.tuple([zBiomesId, z.number().optional()]),
  // Assert entity and specified components are at-or-before tick
  // Example [ID, 1234, 42, 69]
  z.number().array().min(3),
]) as ZodType<Iff>;

export type Catchup = [BiomesId, number];

export const zCatchup = z.tuple([zBiomesId, z.number()]) as ZodType<Catchup>;

export type ChangeToApply = {
  iffs?: Iff[];
  changes?: ProposedChange[];
  events?: FirehoseEvent[];
  catchups?: Catchup[];
};

export const zChangeToApply = z.object({
  // If and only if, apply the below.
  iffs: zIff.array().default([]).optional(),
  // Changes to apply.
  changes: zProposedChange.array().default([]).optional(),
  // Events to publish.
  events: zFirehoseEvent.array().default([]).optional(),
  // Entities and versions that you wish to get updated information on.
  catchups: zCatchup.array().default([]).optional(),
});

export type ApplyStatus = "aborted" | "success";

// Response to a single transaction, either aborted or the new world tick.
export const zApplyStatus = z.enum([
  "aborted",
  "success",
]) as ZodType<ApplyStatus>;

export const zApplyResult = z.tuple([
  // Result of all supplied transactions in order.
  zApplyStatus.array(),
  // Any eager changes you should apply locally.
  zChange.array(),
]);

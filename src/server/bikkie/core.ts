import type {
  InferenceContext,
  InferenceRule,
} from "@/server/shared/bikkie/bakery";
import type {
  AnyBikkieAttribute,
  AnyBikkieAttributeOfType,
  InferBikkieAttribute,
} from "@/shared/bikkie/attributes";
import type { BinaryAttributeSample } from "@/shared/bikkie/schema/binary";
import { zAnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { log } from "@/shared/logging";
import { ok } from "assert";
import type { ZodTypeAny, z } from "zod";

type MaybeOptionalBikkieAttribute = AnyBikkieAttribute & { optional?: boolean };

export function optional<T extends AnyBikkieAttribute>(
  attribute: T
): T & { optional: true } {
  return {
    ...attribute,
    optional: true,
  };
}

export type InferenceRuleInputSpec = {
  [key: string]: MaybeOptionalBikkieAttribute;
};

export type InferenceRuleFor<
  TInput extends InferenceRuleInputSpec,
  TOutputType extends ZodTypeAny
> = InferenceRule<TInput[string][], TOutputType>;

export type InferenceInputForSpec<TInput extends InferenceRuleInputSpec> = {
  [K in keyof TInput]: TInput[K] extends { optional: true }
    ? InferBikkieAttribute<TInput[K]> | undefined
    : InferBikkieAttribute<TInput[K]>;
};

// Helper to define an inference rule.
export function inferenceRule<
  TInput extends InferenceRuleInputSpec,
  TOutputType extends ZodTypeAny
>(
  name: string,
  inputSpec: TInput,
  _outputType: TOutputType,
  fn: (
    inputs: Omit<InferenceInputForSpec<TInput>, "context"> & {
      context: InferenceContext<
        typeof zAnyBinaryAttribute,
        AnyBikkieAttributeOfType<typeof zAnyBinaryAttribute>
      >;
    }
  ) => Promise<z.infer<TOutputType> | undefined>
): InferenceRule<TInput[string][], TOutputType> {
  const keys: string[] = [];
  const inputs: number[] = [];
  const optionalInputs: number[] = [];
  for (const [key, input] of Object.entries(inputSpec)) {
    keys.push(key);
    inputs.push(input.id);
    if (input.optional) {
      optionalInputs.push(input.id);
    }
  }
  return {
    name,
    inputs,
    optionalInputs,
    fn: (context: InferenceContext<TOutputType>, inputs: unknown[]) => {
      ok(inputs.length === keys.length);
      const obj: any = { context };
      for (let i = 0; i < keys.length; ++i) {
        obj[keys[i]] = inputs[i];
      }
      return fn(obj);
    },
  };
}

export interface BinaryInferenceRuleOutput {
  data: Buffer;
  mime: string;
  samples?: BinaryAttributeSample[];
}

// Simplified inference rule where you wish to generate (and store)
// a binary output.
export function binaryOutputInferenceRule<
  TInput extends InferenceRuleInputSpec
>(
  name: string,
  input: TInput,
  fn: (
    inputs: Omit<InferenceInputForSpec<TInput>, "context"> & {
      context: InferenceContext<
        typeof zAnyBinaryAttribute,
        AnyBikkieAttributeOfType<typeof zAnyBinaryAttribute>
      >;
    }
  ) => Promise<BinaryInferenceRuleOutput | undefined>
) {
  return inferenceRule(name, input, zAnyBinaryAttribute, async (inputs) => {
    const outputData = await fn(inputs);
    if (!outputData) {
      return;
    }
    const { data, mime, samples } = outputData;
    const result = await inputs.context.binaries.store(
      `infer:${name}`,
      data,
      mime,
      ...(samples || [])
    );
    log.info(`Generated ${name}`, { result });
    return result;
  });
}

// Helper to define a binary transform rule, where there's one required
// binary input, and produces a binary output.
export function binaryTransformInferenceRule<
  TInputDataKey extends Exclude<string, "context">,
  TInput extends InferenceRuleInputSpec & {
    [K in TInputDataKey]: AnyBikkieAttribute;
  }
>(
  name: string,
  input: TInput,
  fetch: TInputDataKey,
  fn: (
    inputs: Omit<InferenceInputForSpec<TInput>, TInputDataKey | "context"> & {
      context: InferenceContext<
        typeof zAnyBinaryAttribute,
        AnyBikkieAttributeOfType<typeof zAnyBinaryAttribute>
      >;
    } & {
      [K in TInputDataKey]: Buffer;
    }
  ) => Promise<BinaryInferenceRuleOutput | undefined>
) {
  return binaryOutputInferenceRule(name, input, async (inputs) => {
    const lookupKey = inputs[fetch as any];
    if (!lookupKey) {
      return;
    }
    const inputData = await inputs.context.binaries.fetch(lookupKey);
    if (!inputData || !inputData.length) {
      return;
    }
    return fn({
      ...inputs,
      [fetch]: inputData,
    } as any);
  });
}

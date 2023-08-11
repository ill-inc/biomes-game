import {
  downloadFromBucket,
  existsInBucket,
  uploadToBucket,
} from "@/server/web/cloud_storage/cloud_storage";
import type { BinaryAttributeSample } from "@/shared/bikkie/schema/binary";
import {
  gcsPathForAttribute,
  type AnyBinaryAttribute,
} from "@/shared/bikkie/schema/binary";
import { AsyncThrottle } from "@/shared/util/throttling";
import { ok } from "assert";
import { subtle } from "crypto";
import { keys } from "lodash";
import { extension } from "mime-types";

export interface BinaryStore {
  fetch(attribute: AnyBinaryAttribute): Promise<Buffer | undefined>;
  store(
    origin: string,
    data: Buffer,
    mime?: string,
    ...samples: BinaryAttributeSample[]
  ): Promise<AnyBinaryAttribute>;
  publish(attribute: AnyBinaryAttribute): Promise<void>;
}

function samplesOk(samples?: BinaryAttributeSample[]) {
  if (samples === undefined) {
    return;
  }
  ok(samples.length > 0);
  ok(
    samples.every(
      (s) => s.value.samples === undefined && keys(s.key).length > 0
    )
  );
}

function hashForAttribute(attribute: AnyBinaryAttribute): string {
  if (attribute.samples) {
    return `${attribute.hash}+${attribute.samples
      .map((s) => s.value.hash)
      .sort()
      .join(":")}`;
  }
  return attribute.hash;
}

export class CachingBinaryStore implements BinaryStore {
  private readonly cache = new Map<string, Promise<Buffer | undefined>>();
  private readonly published = new Set<string>();

  constructor(private readonly backing: BinaryStore) {}

  fetch(attribute: AnyBinaryAttribute): Promise<Buffer | undefined> {
    const { hash } = attribute;
    let promise = this.cache.get(hash);
    if (!promise) {
      promise = this.backing.fetch(attribute);
      this.cache.set(hash, promise);
    }
    return promise;
  }

  async store(
    origin: string,
    data: Buffer,
    mime?: string,
    ...samples: BinaryAttributeSample[]
  ): Promise<AnyBinaryAttribute> {
    const attribute = await this.backing.store(origin, data, mime, ...samples);
    this.cache.set(attribute.hash, Promise.resolve(data));
    return attribute;
  }

  async publish(attribute: AnyBinaryAttribute): Promise<void> {
    const hash = hashForAttribute(attribute);
    if (this.published.has(hash)) {
      return;
    }
    await this.backing.publish(attribute);
    this.published.add(hash);
  }
}

async function sha1(data: Buffer): Promise<string> {
  const digest = await subtle.digest("SHA-1", data);
  return Buffer.from(digest).toString("hex");
}

const GCS_MAX_WRITES_PER_SECOND_PER_OBJECT = 0.5; // Real limit is '1' but give a buffer.

export class GcsBinaryStore implements BinaryStore {
  private readonly throttle = new AsyncThrottle<string>(
    GCS_MAX_WRITES_PER_SECOND_PER_OBJECT
  );

  async fetch(attribute: AnyBinaryAttribute): Promise<Buffer | undefined> {
    if (!attribute.hash) {
      return Buffer.alloc(0);
    }
    return downloadFromBucket("biomes-bikkie", gcsPathForAttribute(attribute));
  }

  async store(
    origin: string,
    data: Buffer,
    mime?: string,
    ...samples: BinaryAttributeSample[]
  ): Promise<AnyBinaryAttribute> {
    const attribute: AnyBinaryAttribute = {
      origin,
      hash: await sha1(data),
    };
    if (samples.length > 0) {
      samplesOk(samples);
      attribute.samples = samples;
    }
    if (mime) {
      attribute.mime = mime;
      const ext = extension(mime);
      if (ext) {
        attribute.ext = ext;
      }
    }
    const path = gcsPathForAttribute(attribute);
    if (await existsInBucket("biomes-static", path)) {
      return attribute;
    }
    await this.throttle.gate(path, async () =>
      uploadToBucket("biomes-bikkie", path, data, mime)
    );
    return attribute;
  }

  async publish(target: AnyBinaryAttribute): Promise<void> {
    const closure = [target, ...(target.samples?.map((s) => s.value) ?? [])];
    await Promise.all(
      closure.map(async (attribute) => {
        const path = gcsPathForAttribute(attribute);
        if (await existsInBucket("biomes-static", path)) {
          return;
        }
        const contents = await this.fetch(attribute);
        ok(contents);
        await uploadToBucket("biomes-static", path, contents);
      })
    );
  }
}

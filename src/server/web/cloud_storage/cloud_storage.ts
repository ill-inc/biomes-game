import { log } from "@/shared/logging";
import {
  localPath,
  useLocalDisk,
  type CloudBucketKey,
} from "@/shared/url_types";
import { stripLeadingSlash } from "@/shared/util/helpers";
import { asyncBackoffOnRecoverableError } from "@/shared/util/retry_helpers";
import type { SaveOptions } from "@google-cloud/storage";
import * as gcs from "@google-cloud/storage";
import { pathExists } from "fs-extra";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

let instance: gcs.Storage | null = null;

function getInstance(): gcs.Storage {
  if (instance === null) {
    instance = new gcs.Storage();
  }
  return instance;
}

export function getStorageBucketInstance(bucketName: string) {
  return getInstance().bucket(bucketName);
}
export async function uploadToBucket(
  bucket: CloudBucketKey,
  path: string,
  data: Buffer | string,
  mimeType?: string
) {
  if (useLocalDisk()) {
    log.warn(
      `uploadToBucket called with local disk enabled. Bucket: ${bucket}, path: ${path}`
    );
    // Make the parent directory
    const file = localPath(bucket, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    return;
  }
  const instance = getStorageBucketInstance(bucket);
  const file = instance.file(stripLeadingSlash(path));
  const fileOptions: SaveOptions = {
    resumable: false,
    metadata: {
      contentType: mimeType,
    },
    validation: false,
  };

  return asyncBackoffOnRecoverableError(
    async () => file.save(data, fileOptions),
    (error) => {
      log.warn(`Error uploading to bucket ${bucket} at path ${path}`, {
        error,
      });
      return true;
    },
    {
      baseMs: 100,
      maxMs: 500,
      maxAttempts: 10,
    }
  );
}

export async function downloadFromBucket(bucket: CloudBucketKey, path: string) {
  if (useLocalDisk()) {
    return readFile(localPath(bucket, path));
  }
  const instance = getStorageBucketInstance(bucket);
  const file = instance.file(stripLeadingSlash(path));

  return asyncBackoffOnRecoverableError(
    async () => file.download().then(([data]) => data),
    (error) => {
      log.warn(`Error downloading from bucket ${bucket} at path ${path}`, {
        error,
      });
      return true;
    },
    {
      baseMs: 100,
      maxMs: 500,
      maxAttempts: 10,
    }
  );
}

export async function downloadFromBucketViaStreaming(
  bucket: CloudBucketKey,
  path: string
) {
  if (useLocalDisk()) {
    return readFile(localPath(bucket, path));
  }
  const instance = getStorageBucketInstance(bucket);
  const file = instance.file(stripLeadingSlash(path));
  const chunks = [];
  for await (const chunk of file.createReadStream()) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function existsInBucket(bucket: CloudBucketKey, path: string) {
  if (useLocalDisk()) {
    return pathExists(localPath(bucket, path));
  }
  const instance = getStorageBucketInstance(bucket);
  const file = instance.file(stripLeadingSlash(path));

  return asyncBackoffOnRecoverableError(
    async () => file.exists().then(([exists]) => exists),
    (error) => {
      log.warn(`Error in exists check in bucket ${bucket} at path ${path}`, {
        error,
      });
      return true;
    },
    {
      baseMs: 100,
      maxMs: 500,
      maxAttempts: 10,
    }
  );
}

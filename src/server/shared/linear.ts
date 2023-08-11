import { getSecret } from "@/server/shared/secrets";
import * as cloud_storage from "@/server/web/cloud_storage/cloud_storage";
import { absoluteBucketURL } from "@/server/web/util/urls";
import { log } from "@/shared/logging";
import type { CloudBucketKey } from "@/shared/url_types";
import { dataURLToBase64 } from "@/shared/util/helpers";
import type { Connection } from "@linear/sdk";
import { LinearClient } from "@linear/sdk";
import { isNil } from "lodash";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export interface Attachment {
  title: string;
  filename: string;
  mimeType: string;
  data: ArrayBuffer;
}

function getLinearClient(): LinearClient | undefined {
  const key = getSecret("linear-api-key");
  if (!key) {
    return;
  }
  if (!(global as any).linearClient) {
    const linearClient = new LinearClient({
      apiKey: key,
    });
    (global as any).linearClient = linearClient;
  }
  return (global as any).linearClient;
}

interface CachedId {
  id?: string;
  fetchedAt: number;
}

const cachedIds = new Map<string, Promise<CachedId>>();

const REFRESH_LINEAR_ID_MS = 60 * 60 * 1000;
const REFRESH_LINEAR_UNKNOWN_ID_MS = 60 * 1000;

const GI_TEAM_ID = "ac484409-84bb-439c-abb4-a7853d9dd9b6";

type ItemWithId = { id: string };

async function refreshLinearId<T extends ItemWithId>(
  name: string,
  fn: () => Promise<Connection<T>>
) {
  const connection = await fn();
  const cachedId = {
    id: connection.nodes.length > 0 ? connection.nodes[0].id : undefined,
    fetchedAt: Date.now(),
  };
  cachedIds.set(name, Promise.resolve(cachedId));
  return cachedId;
}

function shouldRefresh(cachedId: CachedId) {
  const age = Date.now() - cachedId.fetchedAt;
  if (cachedId.id) {
    return age > REFRESH_LINEAR_ID_MS;
  } else {
    return age > REFRESH_LINEAR_UNKNOWN_ID_MS;
  }
}

async function getLinearId<T extends ItemWithId>(
  name: string,
  fn: () => Promise<Connection<T>>
) {
  let known = cachedIds.get(name);
  if (known == undefined) {
    known = refreshLinearId(name, fn);
    cachedIds.set(name, known);
  }
  const cachedId = await known;
  if (shouldRefresh(cachedId)) {
    void refreshLinearId(name, fn);
  }
  return cachedId.id;
}

export async function getLabelId(name: string): Promise<string | undefined> {
  const client = getLinearClient();
  if (!client) {
    return;
  }
  return getLinearId(name, () =>
    client.issueLabels({
      filter: {
        name: { eq: name },
      },
    })
  );
}

export async function uploadForInlineImage(
  imageDataURI: string
): Promise<string> {
  const BUCKET_NAME: CloudBucketKey = "biomes-social";
  const filepath = `linear-attachments/${uuid()}.png`;

  const b64 = dataURLToBase64(imageDataURI);
  const image = Buffer.from(b64, "base64");
  const data = await sharp(image).png().toBuffer();

  await cloud_storage.uploadToBucket(
    BUCKET_NAME,
    filepath,
    Buffer.from(data),
    "image/png"
  );

  return absoluteBucketURL(BUCKET_NAME, filepath);
}

async function uploadAttachment(attachment: Attachment, folder: string) {
  const BUCKET_NAME: CloudBucketKey = "report-attachments";
  // Attachment data is uploaded to our own GCS bucket, and we link to it from
  // Linear.  Linear does have an API that suggests the ability to upload data
  // to Linear directly, `uploadFile()`, however it appears to be primarily for
  // internal use only. See
  //   https://linearcustomers.slack.com/archives/CN61HRZ9T/p1635900048022700
  // for more information.
  const filepath = `${folder}/${attachment.filename}`;
  await cloud_storage.uploadToBucket(
    BUCKET_NAME,
    filepath,
    Buffer.from(attachment.data),
    attachment.mimeType
  );

  return {
    ...attachment,
    url: absoluteBucketURL(BUCKET_NAME, filepath),
  };
}

export async function createIssue({
  title,
  labels,
  description,
  attachments,
}: {
  title: string;
  labels: string[];
  description: string;
  attachments: Attachment[];
}) {
  const client = getLinearClient();
  if (!client) {
    return;
  }
  const labelIds = (await Promise.all(labels.map(getLabelId))).filter(
    (x) => !isNil(x)
  ) as string[];

  const issue = await client.issueCreate({
    teamId: GI_TEAM_ID,
    title,
    labelIds,
    description,
  });

  if (!issue.issue) {
    log.error(`Error creating report with title: ${title}`);
    return;
  }
  const issueData = await issue.issue;
  const issueId = issueData.id;

  // Upload the attachments, and associate them to the issue.
  await Promise.all(
    attachments.map((a) =>
      uploadAttachment(a, `report-attachments/${issueData.identifier}`).then(
        (u) =>
          client.attachmentCreate({
            title: u.title,
            issueId: issueId,
            url: u.url,
          })
      )
    )
  );

  return issueData.identifier;
}

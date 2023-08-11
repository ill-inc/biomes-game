import { fullPath, type Asset } from "@/shared/drive/types";
import { compactMap } from "@/shared/util/collections";
import { ok } from "assert";
import type { drive_v3 } from "googleapis";
import { google } from "googleapis";
import type { Readable } from "stream";

const ART_SHARED_DRIVE_ID = "0ADfpoYYSclwwUk9PVA";

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();
    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}

const FILE_REQUIRED_FIELDS =
  "id,modifiedTime,parents,name,md5Checksum,size,mimeType";

// To run this locally in the same sense that production operates, you must
// have permission to generate tokens for the drive-access service account.
// This is done by running the following command (the first time):
//   gcloud iam service-accounts add-iam-policy-binding \
//     drive-access@zones-cloud.iam.gserviceaccount.com --member user:[USER_EMAIL] \
//     --role roles/iam.serviceAccountTokenCreator
//
// Now, having done that, you can run this command to login-as that service account locally.
//   gcloud auth application-default login \
//     --scopes=openid,https://www.googleapis.com/auth/drive,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/accounts.reauth \
//     --impersonate-service-account=drive-access@zones-cloud.iam.gserviceaccount.com
export class AssetDrive {
  // Mapping from Google Drive ID to asset.
  private readonly assets = new Map<string, Asset>();
  // Mapping from Google Drive ID to parent.
  private readonly parents = new Map<string, string>();
  // Mapping from Google Drive ID to folder name.
  private readonly folders = new Map<string, string>();
  // Sorted assets by full path.
  private sorted: Asset[] = [];

  private constructor(
    private readonly service: drive_v3.Drive,
    private token: string
  ) {}

  static async create(): Promise<AssetDrive> {
    const service = google.drive({
      version: "v3",
      auth: new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive"],
      }),
    });
    // Get the initial page token.
    const token = (
      await service.changes.getStartPageToken({
        driveId: ART_SHARED_DRIVE_ID,
        supportsAllDrives: true,
        fields: "*",
      })
    ).data.startPageToken;
    ok(token, "Failed to get start page token");

    // By bootstrapping after the page token was fetched, we can avoid
    // missing any changes.
    const drive = new AssetDrive(service, token);
    await drive.bootstrap();
    return drive;
  }

  private constructPath(to?: string): string {
    if (!to) {
      return "";
    }
    const folder = this.folders.get(to);
    if (!folder) {
      return "";
    }
    return `${this.constructPath(this.parents.get(to))}/${folder}`;
  }

  private handleFiles(files: drive_v3.Schema$File[]) {
    if (!files.length) {
      return;
    }
    for (const file of files) {
      if (!file.id) {
        continue;
      }
      const modified = file.modifiedTime
        ? new Date(file.modifiedTime)
        : undefined;
      const parent = (() => {
        const parent = file.parents?.[0];
        if (!parent || parent === ART_SHARED_DRIVE_ID) {
          return "";
        }
        return parent;
      })();
      if (
        file.name &&
        file.md5Checksum &&
        file.size &&
        file.mimeType &&
        modified
      ) {
        this.assets.set(file.id, {
          id: file.id,
          name: file.name,
          path: "", // Placeholder, corrected below.
          modifiedAtMs: modified.getTime(),
          md5: file.md5Checksum.toLowerCase(),
          mime: file.mimeType,
          size: parseInt(file.size),
        });
        this.parents.set(file.id, parent);
      }
      if (file.name && file.mimeType === "application/vnd.google-apps.folder") {
        this.folders.set(file.id, file.name);
        this.parents.set(file.id, parent);
      }
    }
    // Update all paths in case parent names have changed.
    for (const asset of this.assets.values()) {
      asset.path = this.constructPath(this.parents.get(asset.id));
    }
    this.sorted = Array.from(this.assets.values()).sort((a, b) =>
      fullPath(a).localeCompare(fullPath(b))
    );
  }

  private async bootstrap() {
    let pageToken: string | undefined;
    const request = {
      corpora: "drive",
      driveId: ART_SHARED_DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: `files(${FILE_REQUIRED_FIELDS}),nextPageToken`,
      orderBy: "modifiedTime",
    } as const;
    while (true) {
      const response = await this.service.files.list({
        ...request,
        pageToken,
      });
      this.handleFiles(response.data.files ?? []);
      if (!response.data.nextPageToken) {
        break;
      }
      pageToken = response.data.nextPageToken;
    }
  }

  private async refresh() {
    let pageToken = this.token;
    const request = {
      driveId: ART_SHARED_DRIVE_ID,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      includeRemoved: false,
      fields: `changes(fileId,changeType,file(${FILE_REQUIRED_FIELDS})),newStartPageToken,nextPageToken`,
    } as const;
    while (pageToken) {
      const response = await this.service.changes.list({
        ...request,
        pageToken,
      });
      const files = compactMap(response.data.changes, (change) => {
        if (!change.fileId || change.changeType !== "file" || !change.file) {
          return;
        }
        return change.file;
      });
      this.handleFiles(files);
      if (response.data.newStartPageToken) {
        this.token = response.data.newStartPageToken;
      }
      pageToken = response.data.nextPageToken || "";
    }
  }

  async listAssets(): Promise<ReadonlyArray<Asset>> {
    await this.refresh();
    return this.sorted;
  }

  async fetch(asset: Asset): Promise<Buffer> {
    const response = await this.service.files.get(
      {
        fileId: asset.id,
        alt: "media",
      },
      { responseType: "stream" }
    );
    return readableToBuffer(response.data);
  }
}

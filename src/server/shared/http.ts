import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
import { gzip, ungzip } from "node-gzip";
import type { ZodSchema } from "zod";

export function registerDummyHttp() {
  return createServer((_req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain",
    });
    res.end("Hello, Biomie!");
  });
}

export async function jsonFromRequest<T>(
  req: IncomingMessage,
  zodType: ZodSchema<T>
): Promise<T | undefined> {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const jsonString = Buffer.concat(buffers).toString();
  if (jsonString === "") {
    return;
  }
  return zodType.parse(JSON.parse(jsonString));
}

// For providing data that is either compressed or uncompressed initially.
// Compressed data is via gzip.
export class CompressibleData {
  private constructor(private data?: Buffer, private compressed?: Buffer) {}

  static fromCompressed(compressed: Buffer) {
    return new CompressibleData(undefined, compressed);
  }

  static fromUncompressed(data: Buffer) {
    return new CompressibleData(data, undefined);
  }

  async getCompressed() {
    if (this.compressed === undefined) {
      this.compressed = await gzip(this.data!);
    }
    return this.compressed;
  }

  async getUncompressed() {
    if (this.data === undefined) {
      this.data = await ungzip(this.compressed!);
    }
    return this.data;
  }
}

// Compress the data, if the client indicates they support it in their
// request headers.
export async function maybeCompressData(
  req: IncomingMessage,
  res: ServerResponse,
  data: CompressibleData
) {
  const acceptEncodingHeader =
    "accept-encoding" in req.headers
      ? req.headers["accept-encoding"]
      : undefined;
  if (acceptEncodingHeader && acceptEncodingHeader.indexOf("gzip") != -1) {
    res.setHeader("Content-Encoding", "gzip");
    return data.getCompressed();
  } else {
    return data.getUncompressed();
  }
}

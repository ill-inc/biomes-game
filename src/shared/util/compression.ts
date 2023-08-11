export async function gzip(data: Buffer | Uint8Array): Promise<Buffer> {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const compressed = blob.stream().pipeThrough(new CompressionStream("gzip"));
  return Buffer.from(await new Response(compressed).arrayBuffer());
}

export async function gunzip(data: Buffer | Uint8Array): Promise<Buffer> {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const decompressed = blob
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return Buffer.from(await new Response(decompressed).arrayBuffer());
}

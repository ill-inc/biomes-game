export async function readJsonFile(description: string = "JSON file") {
  const [handle]: FileSystemFileHandle[] = await (
    window as any
  ).showOpenFilePicker({
    types: [
      {
        description: `${description}`,
        accept: {
          "application/json": [".json"],
        },
      },
    ],
    multiple: false,
  });

  const file = await handle.getFile();
  const text = await file.text();
  return JSON.parse(text);
}

export async function saveJsonFile(
  object: unknown,
  description: string = "JSON file"
) {
  const handle: FileSystemFileHandle = await (window as any).showSaveFilePicker(
    {
      types: [
        {
          description: `${description}`,
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    }
  );

  const stream = await (handle as any).createWritable();
  await stream.write(JSON.stringify(object, null, 4));
  await stream.close();
}

export async function readPngFile() {
  const [handle]: FileSystemFileHandle[] = await (
    window as any
  ).showOpenFilePicker({
    types: [
      {
        description: "PNG",
        accept: {
          "images/png": [".png"],
        },
      },
    ],
    multiple: false,
  });

  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function readGltfFile() {
  const [handle]: FileSystemFileHandle[] = await (
    window as any
  ).showOpenFilePicker({
    types: [
      {
        description: "GLTF",
        accept: {
          "application/json": [".gltf"],
        },
      },
    ],
    multiple: false,
  });

  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

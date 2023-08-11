import type { AssetServerConnection } from "@/galois/editor/view/api";

export async function getWorkspaceItemMeshNames(
  assetServer: AssetServerConnection
): Promise<string[]> {
  const itemMeshPathRe = /item_meshes\/(.*)\.vox$/;
  const itemVoxes = await assetServer.glob(itemMeshPathRe);
  return itemVoxes.map((x) => x.match(itemMeshPathRe)![1]);
}

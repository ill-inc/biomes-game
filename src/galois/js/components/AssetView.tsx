import { getAsset } from "@/galois/assets";
import { GeometryComponent } from "@/galois/components/GeometryComponent";
import { GLTFComponent } from "@/galois/components/GLTFComponent";
import {
  dataIsError,
  ReactDataLoadingOrError,
  renderError,
} from "@/galois/components/helpers/DataLoadingOrError";
import { ReloadCountContext } from "@/galois/components/helpers/ReloadButton";
import { JsonComponent } from "@/galois/components/JsonComponent";
import { MeshComponent } from "@/galois/components/MeshComponent";
import { PNGComponent } from "@/galois/components/PNGComponent";
import type {
  AssetDataMap,
  AssetKind,
  BlockItemMeshData,
  DataOf,
  FloraItemMeshData,
  GlassItemMeshData,
} from "@/galois/interface/types/data";
import * as l from "@/galois/lang";
import type { BuildAssetFn } from "@/galois/server/interface";
import { createContext, useContext } from "react";

const BuildAssetContext = createContext<{
  buildAssetFn?: BuildAssetFn;
}>({});

export function AssetView({
  asset,
  buildAssetFn,
}: {
  asset?: l.Asset;
  buildAssetFn: BuildAssetFn;
}) {
  return (
    <BuildAssetContext.Provider value={{ buildAssetFn: buildAssetFn }}>
      <div className="content">
        {asset ? <AssetContent asset={asset} /> : <></>}
      </div>
    </BuildAssetContext.Provider>
  );
}

function AssetContent({ asset }: { asset: l.Asset }) {
  switch (asset.type) {
    case "Block":
      return <DefaultContent asset={asset as l.Block} />;
    case "BlockAtlas":
      return <DefaultContent asset={asset as l.BlockAtlas} />;
    case "BlockGeometryBuffer":
      return (
        <BlockGeometryBufferContent asset={asset as l.BlockGeometryBuffer} />
      );
    case "BlockIndex":
      return <DefaultContent asset={asset as l.BlockIndex} />;
    case "BlockItemMesh":
      return <BlockItemMeshContent asset={asset as l.BlockItemMesh} />;
    case "GlassItemMesh":
      return <GlassItemMeshContent asset={asset as l.GlassItemMesh} />;
    case "BlockMaterialBuffer":
      return <DefaultContent asset={asset as l.BlockMaterialBuffer} />;
    case "BlockMesh":
      return <BlockMeshContent asset={asset as l.BlockMesh} />;
    case "BlockSample":
      return <DefaultContent asset={asset as l.BlockSample} />;
    case "BlockShape":
      return <DefaultContent asset={asset as l.BlockShape} />;
    case "BlockShapeIndex":
      return <DefaultContent asset={asset as l.BlockShapeIndex} />;
    case "BlockShapeTensor":
      return <DefaultContent asset={asset as l.BlockShapeTensor} />;
    case "BlockTensor":
      return <DefaultContent asset={asset as l.BlockTensor} />;
    case "Flora":
      return <DefaultContent asset={asset as l.Flora} />;
    case "FloraAtlas":
      return <DefaultContent asset={asset as l.FloraAtlas} />;
    case "FloraGeometryBuffer":
      return <DefaultContent asset={asset as l.FloraGeometryBuffer} />;
    case "FloraIndex":
      return <DefaultContent asset={asset as l.FloraIndex} />;
    case "FloraItemMesh":
      return <FloraItemMeshContent asset={asset as l.FloraItemMesh} />;
    case "FloraMesh":
      return <FloraMeshContent asset={asset as l.FloraMesh} />;
    case "FloraSample":
      return <DefaultContent asset={asset as l.FloraSample} />;
    case "FloraTensor":
      return <DefaultContent asset={asset as l.FloraTensor} />;
    case "GlassMesh":
      return <GlassMeshContent asset={asset as l.GlassMesh} />;
    case "GLB":
      return <GLBContent asset={asset as l.GLB} />;
    case "GLTF":
      return <GLTFContent asset={asset as l.GLTF} />;
    case "GLTFItemMesh":
      return <GLTFItemMeshContent asset={asset as l.GLTFItemMesh} />;
    case "GroupMesh":
      return <GroupMeshContent asset={asset as l.GroupMesh} />;
    case "LightingBuffer":
      return <DefaultContent asset={asset as l.LightingBuffer} />;
    case "Mask":
      return <DefaultContent asset={asset as l.Mask} />;
    case "OcclusionTensor":
      return <DefaultContent asset={asset as l.OcclusionTensor} />;
    case "PNG":
      return <PNGContent asset={asset as l.PNG} />;
    case "Pose":
      return <DefaultContent asset={asset as l.Pose} />;
    case "Skeleton":
      return <SkeletonContent asset={asset as l.Skeleton} />;
    case "TerrainMesh":
      return <TerrainMeshContent asset={asset as l.TerrainMesh} />;
    case "TerrainTensor":
      return <DefaultContent asset={asset as l.TerrainTensor} />;
    case "Texture":
      return <TextureContent asset={asset as l.Texture} />;
    case "TextureAtlas":
      return <TextureAtlasContent asset={asset as l.TextureAtlas} />;
    case "Transform":
      return <DefaultContent asset={asset as l.Transform} />;
    case "VoxelMesh":
      return <VoxelMeshContent asset={asset as l.VoxelMesh} />;
    case "WaterMesh":
      return <WaterMeshContent asset={asset as l.WaterMesh} />;
    case "WaterTensor":
      return <DefaultContent asset={asset as l.WaterTensor} />;
    case "WEBM":
      return <DefaultContent asset={asset as l.WEBM} />;
    case "WireframeMesh":
      return <WireframeMeshContent asset={asset as l.WireframeMesh} />;
    default:
      return <JsonComponent data={asset} />;
  }
}

function withLoadedAsset<T extends AssetKind>(
  asset: l.GeneralNode<T>,
  withAssetData: (a: DataOf<T>) => JSX.Element
) {
  const { reloadCount } = useContext(ReloadCountContext);
  const { buildAssetFn } = useContext(BuildAssetContext);
  const dataLoadingOrError = new ReactDataLoadingOrError(buildAssetFn!, [
    reloadCount,
  ]).loadAsset(asset);

  if (!dataLoadingOrError) {
    return <div>Loading...</div>;
  } else if (dataIsError(dataLoadingOrError)) {
    return renderError(dataLoadingOrError);
  } else {
    return withAssetData(dataLoadingOrError);
  }
}

function DefaultContent<T extends keyof AssetDataMap>({
  asset,
}: {
  asset: l.GeneralNode<T>;
}) {
  return withLoadedAsset(asset, (data) => <JsonComponent data={data} />);
}

function BlockGeometryBufferContent({
  asset,
}: {
  asset: l.BlockGeometryBuffer;
}) {
  return withLoadedAsset(asset, (data) => <GeometryComponent data={data} />);
}

function BlockItemMeshContent({ asset }: { asset: l.BlockItemMesh }) {
  console.log(asset);
  const Content = ({ mesh }: { mesh: BlockItemMeshData }) => {
    return withLoadedAsset(
      getAsset("atlases/blocks") as l.BlockAtlas,
      (atlas) => {
        return <MeshComponent data={{ ...mesh, atlas }} />;
      }
    );
  };

  return withLoadedAsset(asset, (mesh) => {
    return <Content mesh={mesh} />;
  });
}

function GlassItemMeshContent({ asset }: { asset: l.GlassItemMesh }) {
  console.log(asset);
  const Content = ({ mesh }: { mesh: GlassItemMeshData }) => {
    return withLoadedAsset(
      getAsset("atlases/glass") as l.BlockAtlas,
      (atlas) => {
        return <MeshComponent data={{ ...mesh, atlas }} />;
      }
    );
  };

  return withLoadedAsset(asset, (mesh) => {
    return <Content mesh={mesh} />;
  });
}

function BlockMeshContent({ asset }: { asset: l.BlockMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function FloraItemMeshContent({ asset }: { asset: l.FloraItemMesh }) {
  const Content = ({ mesh }: { mesh: FloraItemMeshData }) => {
    return withLoadedAsset(
      getAsset("atlases/florae") as l.FloraAtlas,
      (atlas) => {
        return <MeshComponent data={{ ...mesh, atlas }} />;
      }
    );
  };

  return withLoadedAsset(asset, (mesh) => {
    return <Content mesh={mesh} />;
  });
}

function FloraMeshContent({ asset }: { asset: l.FloraMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function GlassMeshContent({ asset }: { asset: l.GlassMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function GLBContentFromData(data: DataOf<"GLB">) {
  return (
    <GLTFComponent
      data={Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0)).buffer}
    />
  );
}
function GLBContent({ asset }: { asset: l.GLB }) {
  return withLoadedAsset(asset, (data) => GLBContentFromData(data));
}

function GLTFContentFromData(data: DataOf<"GLTF">) {
  return <GLTFComponent data={data.data} />;
}

function GLTFContent({ asset }: { asset: l.GLTF }) {
  return withLoadedAsset(asset, (data) => GLTFContentFromData(data));
}

function GLTFItemMeshContent({ asset }: { asset: l.GLTFItemMesh }) {
  return withLoadedAsset(asset, (data) => {
    switch (data.data.kind) {
      case "GLTF":
        return GLTFContentFromData(data.data);
      case "GLB":
        return GLBContentFromData(data.data);
    }
  });
}

function GroupMeshContent({ asset }: { asset: l.GroupMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function WireframeMeshContent({ asset }: { asset: l.WireframeMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function PNGContent({ asset }: { asset: l.PNG }) {
  return withLoadedAsset(asset, (data) => (
    <PNGComponent className="small" data={data.data} />
  ));
}

function SkeletonContent({ asset }: { asset: l.Skeleton }) {
  return withLoadedAsset(asset, (data) => <JsonComponent data={data} />);
}

function TerrainMeshContent({ asset }: { asset: l.TerrainMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function TextureContent({ asset }: { asset: l.Texture }) {
  return withLoadedAsset(l.ToPNG(asset), (data) => (
    <PNGComponent className="small" data={data.data} />
  ));
}

function TextureAtlasContent({ asset }: { asset: l.TextureAtlas }) {
  return withLoadedAsset(l.ToPNG(l.FlattenAtlas(asset)), (data) => (
    <PNGComponent className="large" data={data.data} />
  ));
}

function VoxelMeshContent({ asset }: { asset: l.VoxelMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

function WaterMeshContent({ asset }: { asset: l.WaterMesh }) {
  return withLoadedAsset(asset, (data) => <MeshComponent data={data} />);
}

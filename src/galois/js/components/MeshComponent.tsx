import {
  makeBlockGeometryFromBase64,
  makeFloraGeometryFromBase64,
  makeGroupGeometryFromBase64,
  makeVoxelGeometryFromBase64,
  makeWireframeGeometryFromBase64,
} from "@/galois/components/helpers/geometry";
import {
  makeBufferTextureFromBase64,
  makeColorMap,
  makeColorMapArray,
} from "@/galois/components/helpers/materials";
import { Scene } from "@/galois/components/Scene";
import type {
  BlockAtlasData,
  BlockItemMeshData,
  BlockMeshData,
  FloraAtlasData,
  FloraItemMeshData,
  FloraMeshData,
  GlassItemMeshData,
  GlassMeshData,
  GroupMeshData,
  GroupSubMeshData,
  TerrainMeshData,
  VoxelMeshData,
  WaterMeshData,
  WireframeMeshData,
} from "@/galois/interface/types/data";
import {
  makeBlocksMaterial,
  updateBlocksMaterial,
} from "@/gen/galois/shaders/blocks";
import { makeBlockItemMaterial } from "@/gen/galois/shaders/block_item";
import {
  makeFloraeMaterial,
  updateFloraeMaterial,
} from "@/gen/galois/shaders/florae";
import {
  makeFloraItemMaterial,
  updateFloraItemMaterial,
} from "@/gen/galois/shaders/flora_item";
import {
  makeGlassMaterial,
  updateGlassMaterial,
} from "@/gen/galois/shaders/glass";
import {
  makeVoxelsMaterial,
  updateVoxelsMaterial,
} from "@/gen/galois/shaders/voxels";
import {
  makeWaterMaterial,
  updateWaterMaterial,
} from "@/gen/galois/shaders/water";
import { Checkbox } from "antd";
import React from "react";
import * as THREE from "three";

type BlockItemMeshWithAtlas = BlockItemMeshData & { atlas: BlockAtlasData };
type GlassItemMeshWithAtlas = GlassItemMeshData & { atlas: BlockAtlasData };
type FloraItemMeshWithAtlas = FloraItemMeshData & { atlas: FloraAtlasData };

type MeshData =
  | BlockItemMeshWithAtlas
  | BlockMeshData
  | GlassItemMeshWithAtlas
  | FloraItemMeshWithAtlas
  | FloraMeshData
  | GroupMeshData
  | WireframeMeshData
  | TerrainMeshData
  | GlassMeshData
  | VoxelMeshData
  | WaterMeshData;

export const MeshComponent: React.FunctionComponent<{
  data: MeshData;
}> = ({ data }) => {
  if (data.kind == "BlockMesh") {
    return <BlockMeshComponent data={data} />;
  } else if (data.kind == "BlockItemMesh") {
    return <BlockItemMeshComponent data={data} />;
  } else if (data.kind == "GlassItemMesh") {
    return <GlassItemMeshComponent data={data} />;
  } else if (data.kind == "FloraMesh") {
    return <FloraMeshComponent data={data} />;
  } else if (data.kind == "FloraItemMesh") {
    return <FloraItemMeshComponent data={data} />;
  } else if (data.kind == "GroupMesh") {
    return <GroupMeshComponent data={data} />;
  } else if (data.kind == "GlassMesh") {
    return <GlassMeshComponent data={data} />;
  } else if (data.kind == "TerrainMesh") {
    return <TerrainMeshComponent data={data} />;
  } else if (data.kind == "WaterMesh") {
    return <WaterMeshComponent data={data} />;
  } else if (data.kind == "WireframeMesh") {
    return <WireframeMeshComponent data={data} />;
  } else {
    return <VoxelMeshComponent data={data} />;
  }
};

function BlockItemMeshComponent({ data }: { data: BlockItemMeshWithAtlas }) {
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(data.atlas.colors.data), (c) => c.charCodeAt(0)),
    ...data.atlas.colors.shape
  );
  const mreaMap = makeColorMapArray(
    Uint8Array.from(atob(data.atlas.mrea.data), (c) => c.charCodeAt(0)),
    ...data.atlas.mrea.shape,
    false
  );
  const textureIndex = makeBufferTextureFromBase64(
    data.atlas.index.data,
    ...data.atlas.index.shape
  );

  const mesh = new THREE.Mesh(
    makeBlockGeometryFromBase64(data.vertices, data.indices),
    makeBlockItemMaterial({
      colorMap,
      sampleIndex: data.sample,
      textureIndex,
      mreaMap,
    })
  );

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = (_t: number, _camera: THREE.Camera) => {
    // Set the mesh transforms based on the camera.
    updateBlocksMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function GlassItemMeshComponent({ data }: { data: GlassItemMeshWithAtlas }) {
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(data.atlas.colors.data), (c) => c.charCodeAt(0)),
    ...data.atlas.colors.shape
  );
  const mreaMap = makeColorMapArray(
    Uint8Array.from(atob(data.atlas.mrea.data), (c) => c.charCodeAt(0)),
    ...data.atlas.mrea.shape,
    false
  );
  const textureIndex = makeBufferTextureFromBase64(
    data.atlas.index.data,
    ...data.atlas.index.shape
  );

  const mesh = new THREE.Mesh(
    makeBlockGeometryFromBase64(data.vertices, data.indices),
    makeBlockItemMaterial({
      colorMap,
      sampleIndex: data.sample,
      textureIndex,
      mreaMap,
    })
  );

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = (_t: number, _camera: THREE.Camera) => {
    // Set the mesh transforms based on the camera.
    updateBlocksMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function FloraItemMeshComponent({ data }: { data: FloraItemMeshWithAtlas }) {
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(data.atlas.colors.data), (c) => c.charCodeAt(0)),
    ...data.atlas.colors.shape
  );

  const mesh = new THREE.Mesh(
    makeFloraGeometryFromBase64(data.vertices, data.indices),
    makeFloraItemMaterial({ colorMap })
  );
  mesh.material.side = THREE.DoubleSide;

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateFloraItemMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function buildBlockMesh(data: BlockMeshData) {
  const { atlas, geometry, lighting, material } = data;

  // Load the atlas data.
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(atlas.colors.data), (c) => c.charCodeAt(0)),
    ...atlas.colors.shape
  );

  const mreaMap = makeColorMapArray(
    Uint8Array.from(atob(atlas.mrea.data), (c) => c.charCodeAt(0)),
    ...atlas.mrea.shape,
    false
  );

  const textureIndex = makeBufferTextureFromBase64(
    atlas.index.data,
    ...atlas.index.shape
  );

  // Load the lighting buffers.
  const lightingRank = makeBufferTextureFromBase64(
    lighting.rank.data,
    ...lighting.rank.shape
  );
  const lightingData = makeBufferTextureFromBase64(
    lighting.data.data,
    ...lighting.data.shape
  );

  // Load the material buffers.
  const materialRank = makeBufferTextureFromBase64(
    material.rank.data,
    ...material.rank.shape
  );
  const materialData = makeBufferTextureFromBase64(
    material.data.data,
    ...material.data.shape
  );

  // Create the final scene objects.
  return new THREE.Mesh(
    makeBlockGeometryFromBase64(geometry.vertices, geometry.indices),
    makeBlocksMaterial({
      lightingRank: lightingRank,
      lightingData: lightingData,
      materialRank: materialRank,
      materialData: materialData,
      textureIndex: textureIndex,
      colorMap: colorMap,
      mreaMap: mreaMap,
    })
  );
}

function buildGlassMesh(data: GlassMeshData) {
  const { atlas, geometry, lighting, material } = data;

  // Load the atlas data.
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(atlas.colors.data), (c) => c.charCodeAt(0)),
    ...atlas.colors.shape
  );

  const mreaMap = makeColorMapArray(
    Uint8Array.from(atob(atlas.mrea.data), (c) => c.charCodeAt(0)),
    ...atlas.mrea.shape,
    false
  );

  const textureIndex = makeBufferTextureFromBase64(
    atlas.index.data,
    ...atlas.index.shape
  );

  // Load the lighting buffers.
  const lightingRank = makeBufferTextureFromBase64(
    lighting.rank.data,
    ...lighting.rank.shape
  );
  const lightingData = makeBufferTextureFromBase64(
    lighting.data.data,
    ...lighting.data.shape
  );

  // Load the material buffers.
  const materialRank = makeBufferTextureFromBase64(
    material.rank.data,
    ...material.rank.shape
  );
  const materialData = makeBufferTextureFromBase64(
    material.data.data,
    ...material.data.shape
  );

  // Create the final scene objects.
  return new THREE.Mesh(
    makeBlockGeometryFromBase64(geometry.vertices, geometry.indices),
    makeGlassMaterial({
      lightingRank: lightingRank,
      lightingData: lightingData,
      materialRank: materialRank,
      materialData: materialData,
      textureIndex: textureIndex,
      colorMap: colorMap,
      mreaMap: mreaMap,
    })
  );
}

function BlockMeshComponent({ data }: { data: BlockMeshData }) {
  const mesh = buildBlockMesh(data);

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateBlocksMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function GlassMeshComponent({ data }: { data: GlassMeshData }) {
  const mesh = buildGlassMesh(data);

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateBlocksMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function buildFloraMesh(data: FloraMeshData) {
  const { atlas, geometry, lighting } = data;

  // Load the atlas data.
  const colorMap = makeColorMapArray(
    Uint8Array.from(atob(atlas.colors.data), (c) => c.charCodeAt(0)),
    ...atlas.colors.shape
  );

  // Load the lighting buffer.
  const lightingData = makeBufferTextureFromBase64(
    lighting.data.data,
    ...lighting.data.shape
  );

  // Create the final scene objects.
  const mesh = new THREE.Mesh(
    makeFloraGeometryFromBase64(geometry.vertices, geometry.indices),
    makeFloraeMaterial({ colorMap, lightingData })
  );
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}

function FloraMeshComponent({ data }: { data: FloraMeshData }) {
  // Create the final scene objects.
  const mesh = buildFloraMesh(data);
  mesh.material.side = THREE.DoubleSide;

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateFloraeMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function makeGroupSubMesh(data: GroupSubMeshData) {
  const colorMap = makeColorMap(
    Uint8Array.from(atob(data.texture.data), (c) => c.charCodeAt(0)),
    ...data.texture.shape
  );

  const mesh = new THREE.Mesh(
    makeGroupGeometryFromBase64(data.vertices, data.indices),
    new THREE.MeshPhongMaterial({
      map: colorMap,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      shininess: 0,
      transparent: true,
    })
  );

  return mesh;
}

function GroupMeshComponent({ data }: { data: GroupMeshData }) {
  const blockMesh = makeGroupSubMesh(data.blocks);
  const floraMesh = makeGroupSubMesh(data.florae);
  const glassMesh = makeGroupSubMesh(data.glass);

  const toggleWireframe = () => {
    blockMesh.material.wireframe = !blockMesh.material.wireframe;
    floraMesh.material.wireframe = !floraMesh.material.wireframe;
    glassMesh.material.wireframe = !glassMesh.material.wireframe;
  };

  // Build the lights for the scene.
  const ambLight = new THREE.AmbientLight(0xfffffff, 0.5);
  const dirLight = new THREE.PointLight(0xfffffff, 0.5);
  dirLight.position.set(20, 20, 20);

  // Build the final scene.
  const scene = new THREE.Scene();
  scene.add(blockMesh);
  scene.add(floraMesh);
  scene.add(glassMesh);
  scene.add(dirLight);
  scene.add(ambLight);

  const factory = (_t: number, _camera: THREE.Camera) => {
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox
        checked={blockMesh.material.wireframe}
        onChange={toggleWireframe}
      >
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function WireframeMeshComponent({ data }: { data: WireframeMeshData }) {
  const scene = new THREE.Scene();

  const geometry = makeWireframeGeometryFromBase64(data.vertices, data.indices);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x00aaaa })
  );
  scene.add(mesh);

  const factory = (_t: number, _camera: THREE.Camera) => {
    return scene;
  };

  return <Scene factory={factory}></Scene>;
}

function TerrainMeshComponent({ data }: { data: TerrainMeshData }) {
  const blockMesh = buildBlockMesh(data.block as BlockMeshData);
  const floraMesh = buildFloraMesh(data.flora as FloraMeshData);
  const glassMesh = buildGlassMesh(data.glass as GlassMeshData);

  const toggleWireframe = () => {
    blockMesh.material.wireframe = !blockMesh.material.wireframe;
    floraMesh.material.wireframe = !floraMesh.material.wireframe;
    glassMesh.material.wireframe = !glassMesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateBlocksMaterial(blockMesh.material, {});
    updateFloraeMaterial(floraMesh.material, {});
    updateGlassMaterial(glassMesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(blockMesh);
    scene.add(floraMesh);
    scene.add(glassMesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={false} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

function VoxelMeshComponent({ data }: { data: VoxelMeshData }) {
  const { geometry, material } = data;

  // Load the color map into a texture.
  const texture = makeColorMapArray(
    Uint8Array.from(atob(material.colors.data), (c) => c.charCodeAt(0)),
    ...material.colors.shape
  );

  // Create the final scene objects.
  const mesh = new THREE.Mesh(
    makeVoxelGeometryFromBase64(geometry.vertices, geometry.indices),
    makeVoxelsMaterial({ colorMap: texture })
  );

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateVoxelsMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return <Scene factory={factory} />;
}

function buildWaterMesh(data: WaterMeshData) {
  const { geometry, lighting } = data;

  // Load the lighting buffers.
  const lightingRank = makeBufferTextureFromBase64(
    lighting.rank.data,
    ...lighting.rank.shape
  );
  const lightingData = makeBufferTextureFromBase64(
    lighting.data.data,
    ...lighting.data.shape
  );

  // Create the final scene objects.
  const mesh = new THREE.Mesh(
    makeBlockGeometryFromBase64(geometry.vertices, geometry.indices),
    makeWaterMaterial({ lightingData, lightingRank })
  );
  mesh.material.side = THREE.DoubleSide;
  mesh.material.transparent = true;
  return mesh;
}

function WaterMeshComponent({ data }: { data: WaterMeshData }) {
  // Create the final scene objects.
  const mesh = buildWaterMesh(data);

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };

  const factory = () => {
    // Set the mesh transforms based on the camera.
    updateWaterMaterial(mesh.material, {});

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={mesh.material.wireframe} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

import { makeBlockGeometryFromBase64 } from "@/galois/components/helpers/geometry";
import { JsonComponent } from "@/galois/components/JsonComponent";
import { Scene } from "@/galois/components/Scene";
import type { BlockGeometryBufferData } from "@/galois/interface/types/data";
import {
  makeBlockGeometryMaterial,
  updateBlockGeometryMaterial,
} from "@/gen/galois/shaders/block_geometry";
import { Checkbox } from "antd";
import * as THREE from "three";

type GeometryBufferData = BlockGeometryBufferData;

export function GeometryComponent({ data }: { data: GeometryBufferData }) {
  if (data.kind === "BlockGeometryBuffer") {
    return <BlockGeometryComponent data={data} />;
  } else {
    return <JsonComponent data={data} />;
  }
}

function BlockGeometryComponent({ data }: { data: BlockGeometryBufferData }) {
  // Create the final scene objects.
  const mesh = new THREE.Mesh(
    makeBlockGeometryFromBase64(data.vertices, data.indices),
    makeBlockGeometryMaterial({})
  );

  const toggleWireframe = () => {
    mesh.material.wireframe = !mesh.material.wireframe;
  };
  toggleWireframe();

  const factory = (_t: number, camera: THREE.Camera) => {
    // Set the mesh transforms based on the camera.
    updateBlockGeometryMaterial(mesh.material, {
      projectionMatrix: camera.projectionMatrix.toArray(),
    });

    // Define the final scene.
    const scene = new THREE.Scene();
    scene.add(mesh);
    return scene;
  };

  return (
    <Scene factory={factory}>
      <Checkbox checked={true} onChange={toggleWireframe}>
        Wireframe
      </Checkbox>
    </Scene>
  );
}

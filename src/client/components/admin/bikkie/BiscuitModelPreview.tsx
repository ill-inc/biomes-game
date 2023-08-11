import { useBikkieEditorContext } from "@/client/components/admin/bikkie/BikkieEditorContext";
import { BiscuitGltfPreview } from "@/client/components/admin/bikkie/BiscuitGltfPreview";
import { loadItemGltf } from "@/client/game/resources/item_mesh";
import { makeNpcTypeMesh } from "@/client/game/resources/npcs";
import { loadPlaceableTypeMesh } from "@/client/game/resources/placeables/helpers";
import type { Disposable } from "@/shared/disposable";
import { anItem } from "@/shared/game/item";
import { useEffect, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export function BiscuitModelPreview() {
  const { selected } = useBikkieEditorContext();
  const [gltf, setGltf] = useState<undefined | Disposable<GLTF>>(undefined);

  useEffect(() => {
    const id = selected?.id;
    if (id !== undefined) {
      const item = anItem(id);
      makeNpcTypeMesh(id)
        .catch(() => loadPlaceableTypeMesh(item))
        .catch(() => loadItemGltf(item))
        .then(setGltf)
        .catch(() => {});
    }

    return () => {
      gltf?.dispose();
    };
  }, [selected]);

  if (!gltf) {
    return <></>;
  }

  return <BiscuitGltfPreview gltf={gltf} />;
}

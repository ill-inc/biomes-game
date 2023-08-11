from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "ItemMeshProperties",
        t.External("ItemMeshProperties"),
        "A set or properties describing an item.",
    )
    g.define("GLTFItemMesh", t.External("GLTFItemMesh"))


def define_funcs(g: FuncGenerator):
    g.define(
        "LoadItemMeshPropertiesFromJSONOrUseDefault",
        args=OrderedDict(
            filePath="Str", namedAffineTransforms="NamedAffineTransforms"
        ),
        type="ItemMeshProperties",
        desc="Loads a set of properties describing an item mesh from a JSON file, or if the JSON file doesn't exist, default values will be used.",
    )
    g.define(
        "GetTransform",
        args=OrderedDict(
            itemMeshProperties="ItemMeshProperties",
        ),
        type="AffineTransform",
        desc="Returns an affine transform to run on the mesh.",
    )
    g.define(
        "GetAttachmentTransform",
        args=OrderedDict(
            itemMeshProperties="ItemMeshProperties",
        ),
        type="AffineTransform",
        desc="Returns an affine transform corresponding to the attachment point for an item mesh.",
    )
    g.define(
        "GetIconSettings",
        args=OrderedDict(
            itemMeshProperties="ItemMeshProperties",
        ),
        type="IconSettings",
        desc="Returns icon settings for rendering the icon of this item mesh.",
    )
    g.define(
        "ToItemMesh",
        args=OrderedDict(gltf="GLTF"),
        type="GLTFItemMesh",
        desc="Wrap a GLTF file into an ItemMesh.",
    )
    g.define(
        "ToItemMesh",
        args=OrderedDict(glb="GLB", handAttachmentTransform="AffineTransform"),
        type="GLTFItemMesh",
        desc="Wrap a GLB file into an ItemMesh.",
    )

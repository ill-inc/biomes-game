import copy
from dataclasses import dataclass
from enum import Enum
from multiprocessing.sharedctypes import Value
from struct import calcsize
from struct import unpack_from as unpack
from typing import Callable, Dict, List, Optional, Tuple, TypeVar, Union

from impl.repo import open_file


class Hidden(Enum):
    NO = 0
    YES = 1


Color = Tuple[int, int, int, int]
Palette = List[Color]  # There's 256 of them.
Node = Union["TransformNode", "GroupNode", "ShapeNode"]


@dataclass
class Chunk:
    id: bytes
    content: bytes
    children: List["Chunk"]


@dataclass
class NodeAttributes:
    name: str
    hidden: Hidden


LayerAttributes = NodeAttributes


@dataclass
class Rotation:
    # How to reorder/permute the axes of the voxel data. Each item should
    # map to exactly one other axis index.
    axis_reordering: Tuple[int, int, int]
    # Whether or not to flip the given axis... each value can only be 1 or -1.
    scale: Tuple[int, int, int]

    T = TypeVar("T")

    def apply_reordering(self, axes: Tuple[T, T, T]):
        return (
            axes[self.axis_reordering[0]],
            axes[self.axis_reordering[1]],
            axes[self.axis_reordering[2]],
        )

    def apply(self, vec: Tuple[int, int, int]):
        return [s * t for s, t in zip(self.scale, self.apply_reordering(vec))]


@dataclass
class Transform:
    translation: Tuple[int, int, int]
    # A rotation matrix where there is exactly one value per column/row,
    # and that value is either 1 or -1. For more details, see
    #   https://github.com/ephtracy/voxel-model/blob/95fae4a529626fd03c77b8ada6b89547c2e731b9/MagicaVoxel-file-format-vox-extension.txt#L23-L42
    rotation: Rotation


def compose_transforms(a: Transform, b: Transform) -> Transform:
    return Transform(
        translation=[
            x + y
            for x, y in zip(
                a.translation,
                a.rotation.apply(b.translation),
            )
        ],
        rotation=Rotation(
            axis_reordering=a.rotation.apply_reordering(
                b.rotation.axis_reordering
            ),
            scale=[
                x * y
                for x, y in zip(
                    a.rotation.scale,
                    a.rotation.apply_reordering(b.rotation.scale),
                )
            ],
        ),
    )


@dataclass
class Frame:
    transform: Transform


# The actual voxel data is stored in Models.
@dataclass
class Model:
    size: Tuple[int, int, int]
    # In the format of [x, y, z, i], where i is an index
    # into the palette for the voxel at position (x, y, z).
    voxels: List[Tuple[int, int, int, int]]

    def __str__(self):
        return f"Model(size={self.size})"

    def __repr__(self):
        return self.__str__()


@dataclass
class Layer:
    name: str
    hidden: Hidden


@dataclass
class TransformNode:
    node_attributes: NodeAttributes
    child: Union[Node, int]  # It's only an integer while parsing.
    layer: Union[Layer, int]  # It's only an integer while parsing.
    frames: List[Frame]


@dataclass
class GroupNode:
    node_attributes: NodeAttributes
    children: List[Union[Node, int]]  # It's only an integer while parsing.


@dataclass
class ShapeNode:
    node_attributes: NodeAttributes
    models: List[Union[Model, int]]  # It's only an integer while parsing.


@dataclass
class ModelWithAttributes:
    model: Model
    hidden: Hidden
    layer: Layer
    transform: Transform


def transform_point(
    point: Tuple[int, int, int], model: ModelWithAttributes
) -> Tuple[int, int, int]:
    if model.transform is None:
        return point

    reordered_size = tuple(
        model.transform.rotation.apply_reordering(model.model.size)
    )
    reordered = tuple(model.transform.rotation.apply_reordering(point))
    # A scale value of "-1" indicates that we should interpret the point
    # point position as moving backwards from the other side of the bounding
    # box. More of a "flip" within the final translated bounding box.
    scaled = tuple(
        [
            reordered[i] if s == 1 else reordered_size[i] - reordered[i] - 1
            for i, s in enumerate(model.transform.rotation.scale)
        ]
    )
    translated = (
        scaled[0] + model.transform.translation[0],
        scaled[1] + model.transform.translation[1],
        scaled[2] + model.transform.translation[2],
    )

    return translated


def map_children(node: Node, fn: Callable[[Node], Node]):
    if isinstance(node, TransformNode):
        node.child = fn(node.child)
    elif isinstance(node, GroupNode):
        node.children = [fn(x) for x in node.children]
    elif isinstance(node, ShapeNode):
        return


@dataclass
class Vox:
    models: List[Model]
    palette: Palette
    root_nodes: List[Node]  # A list of all scene graph root nodes.

    def __str__(self):
        return f"Vox(models: {self.models}, len(root_nodes): {len(self.root_nodes)})"

    def __repr__(self):
        return self.__str__()

    # Scans through the scene graph, flattening transforms as it goes and
    # tracking which layer it's set to.
    def get_scene_graph_model_list(self) -> List[ModelWithAttributes]:
        def flatmap(f, elements):
            return [x for p in elements for x in f(p)]

        def recursion_helper(
            cur_transform: Transform,
            cur_layer: Layer,
            cur_hidden: Hidden,
            node: Node,
            i=0,
        ):
            cur_hidden = (
                Hidden.YES
                if node.node_attributes.hidden == Hidden.YES
                else cur_hidden
            )

            if isinstance(node, TransformNode):
                for frame in node.frames:
                    cur_transform = compose_transforms(
                        cur_transform, frame.transform
                    )
                if node.layer != None:
                    cur_layer = node.layer
                    cur_hidden = (
                        Hidden.YES
                        if cur_layer.hidden == Hidden.YES
                        else cur_hidden
                    )
                return recursion_helper(
                    cur_transform, cur_layer, cur_hidden, node.child, i + 1
                )
            elif isinstance(node, GroupNode):
                return flatmap(
                    lambda n: recursion_helper(
                        cur_transform,
                        cur_layer,
                        cur_hidden,
                        n,
                        i + 1,
                    ),
                    node.children,
                )
            elif isinstance(node, ShapeNode):
                # MagicaVoxel actually uses the center of the model as its
                # origin, so we offset for that here.
                def make_model_with_attributes(m: Model):
                    # Translate from the model's center, in world space, so that
                    # our transforms always put the model's data origin at the transform
                    # origin.
                    model_world_size = cur_transform.rotation.apply_reordering(
                        m.size
                    )
                    centering_translation = [
                        -(x // 2) - (1 if (s < 0 and x % 2 == 1) else 0)
                        for x, s in zip(
                            model_world_size, cur_transform.rotation.scale
                        )
                    ]
                    shape_transform = Transform(
                        translation=[
                            x + y
                            for x, y in zip(
                                cur_transform.translation,
                                centering_translation,
                            )
                        ],
                        rotation=cur_transform.rotation,
                    )
                    return ModelWithAttributes(
                        model=m,
                        hidden=cur_hidden,
                        layer=cur_layer,
                        transform=shape_transform,
                    )

                return [make_model_with_attributes(m) for m in node.models]

        return flatmap(
            lambda n: recursion_helper(
                Transform(
                    translation=[0, 0, 0],
                    rotation=Rotation([0, 1, 2], [1, 1, 1]),
                ),
                None,
                Hidden.NO,
                n,
            ),
            self.root_nodes,
        )


class SerialUnpacker:
    def __init__(self, content: bytes):
        self.content = content
        self.offset = 0
        self.content_length = len(content)

    def unpack(self, fmt: str):
        bytes_to_read = calcsize(fmt)
        if self.offset + bytes_to_read > self.content_length:
            raise ValueError("Reading off the end of the buffer.")
        unpacked = unpack(fmt, self.content, self.offset)
        self.offset += bytes_to_read
        return unpacked

    def read_bytes(self, num_bytes: int) -> bytes:
        return self.unpack(f"{num_bytes}s")[0]

    def done(self) -> bool:
        return self.offset == self.content_length


# For reference, see:
#  https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox.txt
# and
#  https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox-extension.txt
def parse_vox(content: bytes) -> Vox:
    unpacker = SerialUnpacker(content)

    header, version = unpacker.unpack("4si")

    if header != b"VOX ":
        raise ValueError(
            "Did not find 'VOX ' id in file header, invalid vox file."
        )
    if version != 150 and version != 200:
        raise ValueError(
            "Only vox file versions 150 and 200 are currently supported."
        )

    main_chunk = parse_chunk(unpacker)
    if not unpacker.done():
        raise ValueError(
            "Expected to find end-of-file, but some content remains unparsed."
        )

    if main_chunk.id != b"MAIN":
        raise ValueError("Expected first chunk to be MAIN chunk.")

    # All of the chunks have been parsed from the original file content blob now,
    # time to go through them and make sense of them.
    return parse_main_chunks(main_chunk.children)


def parse_main_chunks(main_chunks: List[Chunk]) -> Vox:
    models: List[Model] = []
    palette: Optional[List[Color]] = None
    palette_imap_lookup: Optional[Dict[int, int]] = None
    nodes: Dict[int, Node] = {}
    layers: Dict[int, Layer] = {}

    chunks_to_process = list(reversed(main_chunks))
    num_models_expected = None
    if chunks_to_process and chunks_to_process[-1].id == b"PACK":
        chunk = chunks_to_process.pop()
        num_models_expected = SerialUnpacker(chunk.content).unpack("i")

    while chunks_to_process:
        chunk = chunks_to_process.pop()
        if chunk.id == b"SIZE":
            size = SerialUnpacker(chunk.content).unpack("3i")
            xyzi_chunk = chunks_to_process.pop()
            if xyzi_chunk.id != b"XYZI":
                raise ValueError(
                    f"Expected XYZI chunk to follow a SIZE chunk. Got a '{xyzi_chunk.id}' chunk instead."
                )
            xyzi_unpacker = SerialUnpacker(xyzi_chunk.content)
            num_voxels = xyzi_unpacker.unpack("i")[0]
            voxels: List[Tuple[int, int, int, int]] = []
            for _ in range(num_voxels):
                voxels.append(xyzi_unpacker.unpack("4B"))
            models.append(Model(size, voxels))
        elif chunk.id == b"RGBA":
            palette_unpacker = SerialUnpacker(chunk.content)
            palette = []
            palette.append([0, 0, 0, 0])
            for _ in range(255):
                palette.append(palette_unpacker.unpack("4B"))
        elif chunk.id == b"MATL":
            pass  # We currently don't handle materials.
        elif chunk.id == b"IMAP":
            # This sneaky guy re-orders the palette.
            imap_unpacker = SerialUnpacker(chunk.content)
            imap: List[int] = []
            for i in range(255):
                imap.append(imap_unpacker.unpack("B")[0])
            # Re-order the palette now via the imap
            palette_imap_lookup = {}
            old_palette = copy.copy(palette)
            for i, c in enumerate(imap):
                palette[i + 1] = old_palette[c]
                palette_imap_lookup[c] = i + 1
        elif chunk.id == b"NOTE":
            # We currently don't handle NOTEs (I'm actually not sure what this is).
            pass
        elif chunk.id == b"rCAM":
            # We don't handle cameras.
            pass
        elif chunk.id == b"rCAM":
            # We don't handle cameras.
            pass
        elif chunk.id == b"rOBJ":
            # We don't handle rendering attributes.
            pass
        elif chunk.id == b"nTRN":  # Transform nodes
            transform_unpacker = SerialUnpacker(chunk.content)
            node_id, node_attributes = parse_node_header(transform_unpacker)
            child_node_id = transform_unpacker.unpack("i")[0]
            transform_unpacker.unpack("i")[0]  # Reserved, ignore it.
            layer_id = transform_unpacker.unpack("i")[0]
            num_frames = transform_unpacker.unpack("i")[0]
            frames: List[Frame] = []
            for _ in range(num_frames):
                frames.append(parse_frame(transform_unpacker))
            nodes[node_id] = TransformNode(
                node_attributes=node_attributes,
                child=child_node_id,
                layer=layer_id,
                frames=frames,
            )
        elif chunk.id == b"nGRP":  # Group nodes
            group_unpacker = SerialUnpacker(chunk.content)
            node_id, node_attributes = parse_node_header(group_unpacker)
            num_children = group_unpacker.unpack("i")[0]
            children_ids: List[int] = []
            for _ in range(num_children):
                children_ids.append(group_unpacker.unpack("i")[0])
            nodes[node_id] = GroupNode(
                node_attributes=node_attributes, children=children_ids
            )
        elif chunk.id == b"nSHP":  # Shape nodes
            shape_unpacker = SerialUnpacker(chunk.content)
            node_id, node_attributes = parse_node_header(shape_unpacker)
            num_models = shape_unpacker.unpack("i")[0]

            shape_models: List[int] = []
            for _ in range(num_models):
                shape_models.append(shape_unpacker.unpack("i")[0])
                parse_dict(shape_unpacker)  # A reserved dictionary.
            nodes[node_id] = ShapeNode(
                node_attributes=node_attributes, models=shape_models
            )
        elif chunk.id == b"LAYR":  # Layer
            layer_unpacker = SerialUnpacker(chunk.content)
            layer_id = layer_unpacker.unpack("i")[0]
            # Layers happen to have the same structure as nodes for their
            # attributes, so reuse the code.
            layer_attributes = parse_node_attributes(layer_unpacker)
            layers[layer_id] = Layer(
                name=layer_attributes.name, hidden=layer_attributes.hidden
            )
        else:
            pass

    if num_models_expected and num_models_expected != len(models):
        raise ValueError(
            f"The PACK chunk indicated that we should have {num_models_expected} models, but we instead found {len(models)} models."
        )

    if not palette:
        # But it's easy to support if we need it:
        # https://github.com/ephtracy/voxel-model/blob/95fae4a529626fd03c77b8ada6b89547c2e731b9/MagicaVoxel-file-format-vox.txt#L91-L110
        raise ValueError(
            "This vox file doesn't contain a palette, and we don't support the default palette."
        )

    # Now adjust indices according to the IMAP, to match what a user sees
    # in MagicaVoxel.
    if palette_imap_lookup:
        for model in models:
            for i in range(len(model.voxels)):
                voxel = model.voxels[i]
                model.voxels[i] = [
                    voxel[0],
                    voxel[1],
                    voxel[2],
                    palette_imap_lookup[voxel[3]],
                ]

    # Now that we've parsed everything, update our node indices to point to
    # the actual node objects.
    has_parent = set()
    for n in nodes.values():
        if isinstance(n, TransformNode):
            has_parent.add(n.child)
            n.child = nodes[n.child]
            n.layer = layers[n.layer] if n.layer >= 0 else None
        elif isinstance(n, GroupNode):
            for child in n.children:
                has_parent.add(child)
            n.children = [nodes[x] for x in n.children]
        elif isinstance(n, ShapeNode):
            n.models = [models[x] for x in n.models]
    has_no_parent = set(nodes.keys()) - has_parent
    return Vox(models, palette, root_nodes=[nodes[n] for n in has_no_parent])


def parse_frame(unpacker: SerialUnpacker) -> Frame:
    frame_attributes_dict = parse_dict(unpacker)
    rotation_bytes = frame_attributes_dict.get(b"_r")
    rotation = decode_rotation_bits(
        int(rotation_bytes.decode())
        if rotation_bytes
        else ((0 << 0) | (1 << 2))
    )
    translation_string = frame_attributes_dict.get(b"_t", b"0 0 0").decode()
    translation = [int(x) for x in translation_string.split(" ")]

    return Frame(
        Transform(
            translation=translation,
            rotation=rotation,
        )
    )


def parse_node_header(unpacker: SerialUnpacker) -> Tuple[int, NodeAttributes]:
    node_id = unpacker.unpack("i")[0]
    return node_id, parse_node_attributes(unpacker)


def parse_node_attributes(unpacker: SerialUnpacker) -> NodeAttributes:
    node_attributes_dict = parse_dict(unpacker)
    hidden_bytes = node_attributes_dict.get(b"_hidden", b"0")
    name = node_attributes_dict.get(b"_name", None)
    if name:
        name = name.decode()
    return NodeAttributes(
        name=name,
        hidden=Hidden.YES if hidden_bytes == b"1" else Hidden.NO,
    )


def parse_dict(unpacker: SerialUnpacker) -> Dict[bytes, bytes]:
    num_pairs = unpacker.unpack("i")[0]
    values: Dict[bytes, bytes] = {}
    for _ in range(num_pairs):
        key = parse_string(unpacker)
        value = parse_string(unpacker)
        values[key] = value
    return values


def parse_string(unpacker: SerialUnpacker) -> bytes:
    string_lenth = unpacker.unpack("i")[0]
    return unpacker.read_bytes(string_lenth)


def parse_chunk(unpacker: SerialUnpacker) -> Chunk:
    id, N, M = unpacker.unpack("4sii")
    content = unpacker.read_bytes(N)
    children = parse_multiple_chunks(unpacker, M)

    return Chunk(id, content, children)


def parse_multiple_chunks(
    unpacker: SerialUnpacker, bytes_to_read: int
) -> List[Chunk]:
    start_offset = unpacker.offset
    chunks: List[Chunk] = []
    while unpacker.offset < start_offset + bytes_to_read:
        chunks.append(parse_chunk(unpacker))
    if start_offset + bytes_to_read != unpacker.offset:
        raise ValueError(
            "Chunk sequence read did not end aligned on chunk boundary."
        )
    return chunks


def decode_rotation_bits(bits: int):
    index_of_non_zero_entry_in_first_row = bits & 3
    index_of_non_zero_entry_in_second_row = (bits >> 2) & 3
    index_of_non_zero_entry_in_third_row = list(
        set([0, 1, 2])
        - set(
            [
                index_of_non_zero_entry_in_first_row,
                index_of_non_zero_entry_in_second_row,
            ]
        )
    )[0]

    def sign_bit_to_value(bit):
        return 1 if bit == 0 else -1

    return Rotation(
        axis_reordering=[
            index_of_non_zero_entry_in_first_row,
            index_of_non_zero_entry_in_second_row,
            index_of_non_zero_entry_in_third_row,
        ],
        scale=[
            sign_bit_to_value((bits >> 4) & 1),
            sign_bit_to_value((bits >> 5) & 1),
            sign_bit_to_value((bits >> 6) & 1),
        ],
    )


# Returns a new vox object that contains only the specified layers.
def filter_layers(
    vox_object: Vox,
    keep_layers: List[str],
):
    if len(vox_object.root_nodes) <= 0:
        return vox_object

    def should_include_layer(name):
        return len(keep_layers) == 0 or name in keep_layers

    def recursive_with_filtered_layers_hidden(vox_node: Node):
        if (vox_node.node_attributes.hidden == Hidden.YES) or (
            (
                hasattr(vox_node, "layer")
                and vox_node.layer
                and vox_node.layer.hidden == Hidden.YES
            )
        ):
            return vox_node

        if (
            hasattr(vox_node, "layer")
            and vox_node.layer
            and (not should_include_layer(vox_node.layer.name))
        ):
            # hide the filtered node.
            new_node = copy.copy(vox_node)
            new_node.node_attributes = copy.copy(vox_node.node_attributes)
            new_node.node_attributes.hidden = Hidden.YES
            return new_node

        new_node = copy.copy(vox_node)
        map_children(new_node, recursive_with_filtered_layers_hidden)
        return new_node

    new_vox = copy.copy(vox_object)
    new_vox.root_nodes = [
        recursive_with_filtered_layers_hidden(x) for x in new_vox.root_nodes
    ]

    return new_vox

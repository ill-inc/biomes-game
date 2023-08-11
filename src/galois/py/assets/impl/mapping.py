from impl import types as t


# Check if a set of criteria matches a sample.
def criteria_matches(
    sample: t.BlockSampleCriteria,
    position: str = "any",
    dye: str = "any",
    muck: str = "any",
    moisture: str = "any",
) -> bool:
    def matches(criteria: str, query: str) -> bool:
        return criteria == query or criteria == "any" or query == "any"

    return (
        matches(sample.position, position)
        and matches(sample.dye, dye)
        and matches(sample.muck, muck)
        and matches(sample.moisture, moisture)
    )


def sample_with_cascading(block: t.Block, tile: str, muck: str, dye: str):
    return [
        sample.texture.color.y_pos
        for sample in block.samples
        if criteria_matches(sample.criteria, tile, dye, muck)
    ]


def map_textures_from_block(
    block: t.Block, muck: str = "any", dye: str = "none"
):
    black = sample_with_cascading(block, "black", muck, dye)
    white = sample_with_cascading(block, "white", muck, dye)
    return [black, white]

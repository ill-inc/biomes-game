import { LazyEntity, LazyEntityDelta } from "@/server/shared/ecs/gen/lazy";
import type { LazyCreate, LazyUpdate } from "@/server/shared/ecs/lazy";
import {
  lazyChangeToSerialized,
  mergeLazyChange,
} from "@/server/shared/ecs/lazy";
import { poisonedComponent } from "@/server/shared/ecs/lazy_base";
import { serializeRedisEntity } from "@/server/shared/world/lua/serde";
import { AppearanceComponent, Position } from "@/shared/ecs/gen/components";
import type { Entity } from "@/shared/ecs/gen/entities";
import { SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { zChange } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";
import { omit } from "lodash";

const TEST_ID = 1 as BiomesId;

describe("Lazy Entity Tests", () => {
  const TEST_ENTITY = <Entity>{
    id: TEST_ID,
    position: { v: [1, 2, 3] },
    label: { text: "Hello" },
  };

  it("Ignores deprecated components", () => {
    const lazy = LazyEntity.forEncoded(TEST_ID, {
      "37": "\x01\x91¥Hello",
      "36": "Garbage data from old component",
    });
    assert.deepEqual(lazy.materialize(), {
      id: TEST_ID,
      label: {
        text: "Hello",
      },
    });
  });

  it("Fails unknown components", () => {
    const lazy = LazyEntity.forEncoded(TEST_ID, {
      "37": "\x01\x91¥Hello",
      "10000": "Mystical component",
    });
    assert.throws(() => lazy.materialize(), {
      message: "Unknown component: 1:10000",
    });
  });

  it("Errors poisoned components", () => {
    const encoded = serializeRedisEntity(TEST_ENTITY);

    assert.deepEqual(encoded, {
      "37": "\x01\x91¥Hello",
      "54": "\x01\x91\x93\x01\x02\x03",
    });

    const lazy = LazyEntity.forEncoded(TEST_ID, {
      ...encoded,
      "54": poisonedComponent,
    });

    assert.ok(!lazy.hasAclComponent());
    try {
      lazy.hasPosition();
      assert.fail("Expected to throw");
    } catch (e) {}

    assert.deepEqual(lazy.label(), { text: "Hello" });

    try {
      lazy.position();
      assert.fail("Expected to throw");
    } catch (e) {}
  });

  it("Decodes on demand", () => {
    const encoded = serializeRedisEntity(TEST_ENTITY);

    assert.deepEqual(encoded, {
      "37": "\x01\x91¥Hello",
      "54": "\x01\x91\x93\x01\x02\x03",
    });

    const lazy = LazyEntity.forEncoded(TEST_ID, encoded);

    assert.ok(lazy.hasPosition());
    assert.ok(!lazy.hasAclComponent());

    // Check this didn't decode anything.
    assert.deepEqual(lazy.decoded, { id: TEST_ID });

    assert.deepEqual(lazy.label(), { text: "Hello" });

    assert.deepEqual(lazy.decoded, {
      id: TEST_ID,
      label: {
        text: "Hello",
      },
    });
  });

  it("Can merge no overlap", () => {
    const encodedA = serializeRedisEntity(omit(TEST_ENTITY, "position"));
    const encodedB = serializeRedisEntity(omit(TEST_ENTITY, "label"));

    const lazyA = LazyEntity.forEncoded(TEST_ID, encodedA);
    const lazyB = LazyEntity.forEncoded(TEST_ID, encodedB);

    const merged = lazyA.merge(lazyB);
    assert.deepEqual(merged.materialize(), TEST_ENTITY);
  });

  const OTHER_ENTITY = {
    ...TEST_ENTITY,
    label: { text: "Goodbye" },
  };

  it("Can merge overlap neither decoded", () => {
    const encodedA = serializeRedisEntity(TEST_ENTITY);
    const encodedB = serializeRedisEntity(OTHER_ENTITY);

    const lazyA = LazyEntity.forEncoded(TEST_ID, encodedA);
    const lazyB = LazyEntity.forEncoded(TEST_ID, encodedB);

    const merged = lazyA.merge(lazyB);
    assert.deepEqual(merged.materialize(), OTHER_ENTITY);
  });

  it("Can merge overlap first decoded", () => {
    const encodedA = serializeRedisEntity(TEST_ENTITY);
    const encodedB = serializeRedisEntity(OTHER_ENTITY);

    const lazyA = LazyEntity.forEncoded(TEST_ID, encodedA);
    assert.deepEqual(lazyA.label(), { text: "Hello" });
    const lazyB = LazyEntity.forEncoded(TEST_ID, encodedB);

    const merged = lazyA.merge(lazyB);
    assert.deepEqual(merged.materialize(), OTHER_ENTITY);
  });

  it("Can merge overlap second decoded", () => {
    const encodedA = serializeRedisEntity(TEST_ENTITY);
    const encodedB = serializeRedisEntity(OTHER_ENTITY);

    const lazyA = LazyEntity.forEncoded(TEST_ID, encodedA);
    const lazyB = LazyEntity.forEncoded(TEST_ID, encodedB);
    assert.deepEqual(lazyB.label(), { text: "Goodbye" });

    const merged = lazyA.merge(lazyB);
    assert.deepEqual(merged.materialize(), OTHER_ENTITY);
  });

  it("Can merge overlap both decoded", () => {
    const encodedA = serializeRedisEntity(TEST_ENTITY);
    const encodedB = serializeRedisEntity(OTHER_ENTITY);

    const lazyA = LazyEntity.forEncoded(TEST_ID, encodedA);
    assert.deepEqual(lazyA.label(), { text: "Hello" });
    const lazyB = LazyEntity.forEncoded(TEST_ID, encodedB);
    assert.deepEqual(lazyB.label(), { text: "Goodbye" });

    const merged = lazyA.merge(lazyB);
    assert.deepEqual(merged.materialize(), OTHER_ENTITY);
  });

  type ComponentState = [hasPosition: boolean, hasAppearance: boolean];

  const formatState = ([hasPosition, hasAppearance]: ComponentState) =>
    `[${hasPosition ? "P" : "-"}${hasAppearance ? "A" : "-"}]`;

  const POSITION = Position.create({ v: [1, 2, 3] });
  const APPEARANCE = AppearanceComponent.create({
    appearance: {
      skin_color_id: "skin",
      eye_color_id: "eye",
      hair_color_id: "hair",
      head_id: 42 as BiomesId,
    },
  });

  const makeLazyChange = ([hasPosition, hasAppearance]: ComponentState) => {
    const entity: any = { id: TEST_ID };
    if (hasPosition) {
      entity.position = POSITION;
    }
    if (hasAppearance) {
      entity.appearance_component = APPEARANCE;
    }
    const encoded = serializeRedisEntity(entity);
    const lazy = <LazyUpdate>{
      kind: "update",
      tick: 1,
      entity: LazyEntityDelta.forEncoded(TEST_ID, encoded),
    };
    lazy.entity.position(); // Force decode.
    return lazy;
  };

  for (let i = 0; i < 16; ++i) {
    const prior: ComponentState = [!!(i & 1), !!(i & 2)];
    const after: ComponentState = [!!(i & 4), !!(i & 8)];
    const expected: ComponentState = [
      prior[0] || after[0],
      prior[1] || after[1],
    ];

    it(`mergeLazyChange(${formatState(prior)}, ${formatState(
      after
    )}) = ${formatState(expected)}`, () => {
      const priorLazy = makeLazyChange(prior);
      const afterLazy = makeLazyChange(after);
      const merged = mergeLazyChange(priorLazy, afterLazy) as LazyUpdate;
      const positionExpected = expected[0];
      const appearanceExpected = expected[1];
      assert.equal(merged.kind, "update");
      if (positionExpected) {
        assert.deepEqual(merged.entity.position(), POSITION);
      } else {
        assert.ok(!merged.entity.hasPosition());
      }
      if (appearanceExpected) {
        assert.deepEqual(merged.entity.appearanceComponent(), APPEARANCE);
      } else {
        assert.ok(!merged.entity.hasAppearanceComponent());
      }
    });
  }

  it("Correctly direct serialized when decoded and encoded are merged", () => {
    // Create the base state for the entity.
    const base: LazyCreate = {
      kind: "create",
      tick: 1,
      entity: LazyEntity.forDecoded({
        id: TEST_ID,
        appearance_component: APPEARANCE,
      }),
    };

    // Create a lazy change to position.
    const lazy: LazyUpdate = {
      kind: "update",
      tick: 1,
      entity: LazyEntityDelta.forEncoded(
        TEST_ID,
        serializeRedisEntity({
          id: TEST_ID,
          position: POSITION,
        })
      ),
    };

    const merged = mergeLazyChange(base, lazy) as LazyCreate;
    assert.equal(merged.kind, "create");

    // Serialize the merged change.
    const serialized = lazyChangeToSerialized(SerializeForServer, merged);
    const final = zChange.parse(serialized).change;
    assert.deepEqual(final, {
      kind: "create",
      tick: 1,
      entity: {
        id: TEST_ID,
        appearance_component: APPEARANCE,
        position: POSITION,
      },
    });
  });

  it("Can be directly converted into a wrapped change", () => {
    assert.deepEqual(
      zChange.parse(
        lazyChangeToSerialized(SerializeForServer, {
          kind: "delete",
          tick: 1234,
          id: TEST_ID,
        })
      ).change,
      {
        kind: "delete",
        tick: 1234,
        id: TEST_ID,
      }
    );
    const encoded = serializeRedisEntity(TEST_ENTITY);
    assert.deepEqual(
      zChange.parse(
        lazyChangeToSerialized(SerializeForServer, {
          kind: "update",
          tick: 1234,
          entity: LazyEntityDelta.forEncoded(TEST_ID, encoded),
        })
      ).change,
      {
        kind: "update",
        tick: 1234,
        entity: TEST_ENTITY,
      }
    );
    assert.deepEqual(
      zChange.parse(
        lazyChangeToSerialized(SerializeForServer, {
          kind: "create",
          tick: 1234,
          entity: LazyEntity.forEncoded(TEST_ID, encoded),
        })
      ).change,
      {
        kind: "create",
        tick: 1234,
        entity: TEST_ENTITY,
      }
    );
    assert.deepEqual(
      zChange.parse(
        lazyChangeToSerialized(SerializeForServer, {
          kind: "create",
          tick: 1234,
          entity: LazyEntity.forDecoded(TEST_ENTITY),
        })
      ).change,
      {
        kind: "create",
        tick: 1234,
        entity: TEST_ENTITY,
      }
    );
  });
});

import { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type { TypedResourceDeps } from "@/shared/resources/types";
import assert from "assert";

interface TestResourcePaths {
  "/A": PathDef<[], string>;
  "/B": PathDef<[string], string>;
  "/C": PathDef<[number], string>;
  "/D": PathDef<[], { used: number; dummy: number }>;
  "/E": PathDef<[], { used: number; dummy: number }>;
  "/F": PathDef<[], { used: number; dummy: number; disposed: boolean }>;
  "/FAsync": PathDef<[], Promise<{ used: number; dummy: number }>>;
  "/G": PathDef<[number], { param: number; dUsed: number; disposed: boolean }>;
  "/H": PathDef<[number], { used: number; dummy: number; disposed: boolean }>;
  "/I": PathDef<[], { used: number; dummy: number; disposed: boolean }>;
}

type TestResourceDeps = TypedResourceDeps<TestResourcePaths>;

function A() {
  return "A";
}

function B(_deps: TestResourceDeps, key: string) {
  return `B${key}`;
}

function C(deps: TestResourceDeps, num: number) {
  if (num > 0) {
    const b = deps.get("/B", `${num}`);
    const c = deps.get("/C", num - 1);
    return `C${num}(${b},${c})`;
  } else {
    return "_";
  }
}

function makeResources() {
  const builder = new BiomesResourcesBuilder<TestResourcePaths>({
    collectorParams: {
      capacities: {
        count: 0,
      },
    },
  });
  builder.add("/A", A);
  builder.add("/B", B);
  builder.add("/C", C);
  builder.addGlobal("/D", { used: 5, dummy: 6 });
  builder.addDynamic(
    "/E",
    () => ({ used: 2, dummy: 3 }),
    (deps, previous) => {
      const newValue = deps.get("/D");
      if (newValue.used !== previous.used) {
        Object.assign(previous, newValue);
      }
    }
  );
  builder.addDynamic(
    "/F",
    () => ({
      used: 2,
      dummy: 3,
      disposed: false,
      dispose() {
        this.disposed = true;
      },
    }),
    (deps, previous) => {
      const newValue = deps.get("/D");
      if (newValue.used !== previous.used) {
        Object.assign(previous, newValue);
      }
    }
  );
  builder.addOnce("/G", (deps, param) => {
    const d = deps.get("/D");
    return {
      param,
      dUsed: d.used,
      disposed: false,
      dispose() {
        this.disposed = true;
      },
    };
  });
  builder.addHashChecked(
    "/H",
    (deps, _modulo) => {
      const ret = {
        ...deps.get("/D"),
        disposed: false,
        dispose() {
          this.disposed = true;
        },
      };
      return ret;
    },
    (deps, modulo) => deps.get("/D").used % modulo
  );
  builder.addHashChecked(
    "/I",
    (deps) => {
      const ret = {
        ...deps.get("/D"),
        disposed: false,
        dispose() {
          this.disposed = true;
        },
      };
      return ret;
    },
    (deps) => ({ ...deps.get("/D") }),
    (a, b) => (a.used + b.used) % 2 == 0
  );
  return builder.build();
}

describe("Biomes Resources", () => {
  it("test basic resource usage", () => {
    const resources = makeResources();

    assert.equal(resources.get("/A"), "A");
    assert.equal(resources.get("/B", "1"), "B1");
    assert.equal(resources.get("/B", "2"), "B2");
    assert.equal(resources.get("/C", 1), "C1(B1,_)");
    assert.equal(resources.get("/C", 2), "C2(B2,C1(B1,_))");
  });

  it("Test addUpdate simple", async () => {
    const resources = makeResources();

    const e = resources.get("/E");
    assert.deepEqual(e, { used: 5, dummy: 6 });

    resources.set("/D", { used: 5, dummy: 8 });
    assert.deepEqual(resources.get("/E"), { used: 5, dummy: 6 });

    resources.set("/D", { used: 9, dummy: 7 });
    assert.deepEqual(resources.get("/E"), { used: 9, dummy: 7 });

    // Should be the same instance returned throughout.
    assert.equal(e, resources.get("/E"));
  });

  it("Test addUpdate dispose", async () => {
    const resources = makeResources();

    resources.set("/D", { used: 5, dummy: 6 });
    {
      let f = resources.get("/F");
      assert.equal(f.used, 5);
      assert.equal(f.dummy, 6);
      assert(!f.disposed);

      resources.collect();
      assert(!f.disposed);
      resources.collect();
      assert(f.disposed);

      f = resources.get("/F");
      assert.equal(f.used, 5);
      assert.equal(f.dummy, 6);
      assert(!f.disposed);
    }
  });

  it("Test addOnce", async () => {
    const resources = makeResources();

    let g1 = resources.get("/G", 1);
    assert.equal(g1.dUsed, 5);
    assert.equal(g1.param, 1);

    let g2 = resources.get("/G", 2);
    assert.equal(g2.dUsed, 5);
    assert.equal(g2.param, 2);

    resources.set("/D", { used: 1, dummy: 2 });

    g1 = resources.get("/G", 1);
    assert.equal(g1.dUsed, 5);
    assert.equal(g1.param, 1);

    g2 = resources.get("/G", 2);
    assert.equal(g2.dUsed, 5);
    assert.equal(g2.param, 2);

    const g3 = resources.get("/G", 3);
    assert.equal(g3.dUsed, 1);
    assert.equal(g3.param, 3);

    resources.collect();
    resources.collect();

    assert(g1.disposed);
    assert(g2.disposed);
    assert(g3.disposed);

    resources.set("/D", { used: 10, dummy: 11 });
    g1 = resources.get("/G", 1);
    assert.equal(g1.dUsed, 10);
    assert.equal(g1.param, 1);
  });

  it("Test addHashChecked", async () => {
    const resources = makeResources();

    resources.set("/D", { used: 5, dummy: 1 });
    let h = resources.get("/H", 4);
    assert.equal(h.used, 5);
    assert.equal(h.dummy, 1);
    assert(!h.disposed);

    resources.set("/D", { used: 5, dummy: 6 });
    h = resources.get("/H", 4);
    assert.equal(h.used, 5);
    assert.equal(h.dummy, 1);
    assert(!h.disposed);

    resources.set("/D", { used: 9, dummy: 6 });
    h = resources.get("/H", 4);
    assert.equal(h.used, 5);
    assert.equal(h.dummy, 1);
    assert(!h.disposed);

    resources.set("/D", { used: 8, dummy: 6 });
    h = resources.get("/H", 4);
    assert.equal(h.used, 8);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);

    // Check that setting `hashesEqualFn` to a custom value works properly.
    resources.set("/D", { used: 7, dummy: 6 });
    h = resources.get("/I");
    assert.equal(h.used, 7);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);

    resources.set("/D", { used: 9, dummy: 6 });
    h = resources.get("/I");
    assert.equal(h.used, 7);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);

    resources.set("/D", { used: 2, dummy: 6 });
    h = resources.get("/I");
    assert.equal(h.used, 2);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);

    resources.set("/D", { used: 4, dummy: 6 });
    h = resources.get("/I");
    assert.equal(h.used, 2);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);

    resources.set("/D", { used: 5, dummy: 6 });
    h = resources.get("/I");
    assert.equal(h.used, 5);
    assert.equal(h.dummy, 6);
    assert(!h.disposed);
  });
});

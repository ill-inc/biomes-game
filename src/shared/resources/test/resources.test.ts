import type { ResourceDeps } from "@/shared/resources/core";
import {
  DefaultNodeCollector,
  ResourcesBuilder,
} from "@/shared/resources/core";
import type { PathDef } from "@/shared/resources/path_map";
import type { TypedResourceDeps } from "@/shared/resources/types";
import { TypedResourcesBuilder } from "@/shared/resources/types";
import { Latch } from "@/shared/util/async";
import assert from "assert";

function A() {
  return "A";
}

function B(deps: ResourceDeps, key: string) {
  return `B${key}`;
}

function C(deps: ResourceDeps, num: number) {
  if (num > 0) {
    const b = deps.get("/B", num);
    const c = deps.get("/C", num - 1);
    return `C${num}(${b},${c})`;
  } else {
    return "_";
  }
}

describe("Test basic resource usage", () => {
  const resources = new ResourcesBuilder()
    .add("/A", A)
    .add("/B", B)
    .add("/C", C)
    .build();

  it("should return 'A'", () => {
    assert(resources.get("/A") == "A");
  });
  it("should return 'B1'", () => {
    assert(resources.get("/B", "1") == "B1");
  });
  it("should return 'B2'", () => {
    assert(resources.get("/B", "2") == "B2");
  });
  it("should return 'C1(B1,_)'", () => {
    assert(resources.get("/C", 1) == "C1(B1,_)");
  });
  it("should return 'C2(B2,C1(B1,_))'", () => {
    assert(resources.get("/C", 2) == "C2(B2,C1(B1,_))");
  });
});

describe("Test caching behavior", () => {
  const versions = new Map<number, number>();
  function D(deps: ResourceDeps, n: number) {
    const b = deps.get("/B", String(n));
    const d = n > 0 ? deps.get("/D", n - 1) : "_";
    const version = versions.get(n) || 0;
    versions.set(n, version + 1);
    return `D${n}.${version}(${b},${d})`;
  }

  const resources = new ResourcesBuilder()
    .add("/A", A)
    .add("/B", B)
    .add("/C", C)
    .add("/D", D)
    .build();

  function expect(path: string, args: any[], out: string) {
    assert.equal(resources.get<string>(path, ...args), out);
  }

  it("Should work!", () => {
    expect("/D", [2], "D2.0(B2,D1.0(B1,D0.0(B0,_)))");
    expect("/D", [2], "D2.0(B2,D1.0(B1,D0.0(B0,_)))");
    resources.invalidate("/D", 2);
    expect("/D", [2], "D2.1(B2,D1.0(B1,D0.0(B0,_)))");
    resources.invalidate("/D", 1);
    expect("/D", [2], "D2.2(B2,D1.1(B1,D0.0(B0,_)))");
    expect("/D", [2], "D2.2(B2,D1.1(B1,D0.0(B0,_)))");
    resources.invalidate("/B", "2");
    expect("/D", [2], "D2.3(B2,D1.1(B1,D0.0(B0,_)))");
    expect("/D", [1], "D1.1(B1,D0.0(B0,_))");
    resources.invalidate("/B", "0");
    resources.invalidate("/B", "1");
    resources.invalidate("/B", "2");
    resources.invalidate("/D", 1);
    expect("/B", ["0"], "B0");
    expect("/D", [0], "D0.1(B0,_)");
    expect("/D", [1], "D1.2(B1,D0.1(B0,_))");
    expect("/D", [2], "D2.4(B2,D1.2(B1,D0.1(B0,_)))");
    expect("/D", [1], "D1.2(B1,D0.1(B0,_))");
    expect("/D", [2], "D2.4(B2,D1.2(B1,D0.1(B0,_)))");
    resources.invalidate("/D", 2);
    expect("/D", [2], "D2.5(B2,D1.2(B1,D0.1(B0,_)))");
  });
});

interface TestPaths {
  "/A": PathDef<[], string>;
  "/B": PathDef<[string], string>;
  "/C": PathDef<[number], string>;
}

function typedA() {
  return "A";
}

function typedB(deps: TypedResourceDeps<TestPaths>, key: string) {
  return `B${key}`;
}

function typedC(deps: TypedResourceDeps<TestPaths>, num: number) {
  if (num > 0) {
    const b = deps.get("/B", `${num}`);
    const c = deps.get("/C", num - 1);
    return `C${num}(${b},${c})`;
  } else {
    return "_";
  }
}

describe("Test typed resource usage", () => {
  const resources = new TypedResourcesBuilder<TestPaths>()
    .add("/A", typedA)
    .add("/B", typedB)
    .add("/C", typedC)
    .build();

  it("should return 'A'", () => {
    assert(resources.get("/A") == "A");
  });
  it("should return 'B1'", () => {
    assert(resources.get("/B", "1") == "B1");
  });
  it("should return 'B2'", () => {
    assert(resources.get("/B", "2") == "B2");
  });
  it("should return 'C1(B1,_)'", () => {
    assert(resources.get("/C", 1) == "C1(B1,_)");
  });
  it("should return 'C2(B2,C1(B1,_))'", () => {
    assert(resources.get("/C", 2) == "C2(B2,C1(B1,_))");
  });
});

describe("Test dispose resources", () => {
  const startLatch = new Latch();
  const latchFSignal = new Latch();
  const latchFWait = new Latch();

  const makeDisposeMarker = () => ({
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  });
  const makeWithDep =
    <DepType>(path: string) =>
    (deps: ResourceDeps) => {
      return { ...makeDisposeMarker(), dep: deps.get<DepType>(path) };
    };
  const makePromiseDisposeMarker = () =>
    startLatch.wait().then(makeDisposeMarker);
  const makeWithPromiseDep =
    <DepType extends Promise<any>>(
      path: string
    ): ((deps: ResourceDeps) => Promise<
      ReturnType<typeof makeDisposeMarker> & {
        dep: Awaited<DepType>;
      }
    >) =>
    async (deps: ResourceDeps) => {
      await startLatch.wait();
      const awaitedDep = await deps.get<DepType>(path);
      return {
        ...makeDisposeMarker(),
        dep: awaitedDep,
      };
    };

  const makeA = makeDisposeMarker;
  const makeB = makeWithDep<ReturnType<typeof makeA>>("/A");
  const makeC = makePromiseDisposeMarker;
  const makeD = makeWithPromiseDep<ReturnType<typeof makeC>>("/C");
  const makeE = makeWithPromiseDep<ReturnType<typeof makeD>>("/D");
  const makeF = async (deps: ResourceDeps) => {
    await startLatch.wait();
    const awaitedDep = await deps.get<ReturnType<typeof makeE>>("/E");
    latchFSignal.signal();
    await latchFWait.wait();
    return {
      ...makeDisposeMarker(),
      dep: awaitedDep,
    };
  };

  const makeResources = () => {
    startLatch.reset();
    latchFSignal.reset();
    latchFWait.reset();
    return new ResourcesBuilder()
      .add("/A", makeA)
      .add("/B", makeB)
      .add("/C", makeC)
      .add("/D", makeD)
      .add("/E", makeE)
      .add("/F", makeF)
      .setCollector(new DefaultNodeCollector(0))
      .build();
  };

  it("Simple dispose check.", async () => {
    const resources = makeResources();

    const a = resources.get<ReturnType<typeof makeA>>("/A");
    assert(!a.disposed);
    // The resource system manages resource lifetimes, so the dispatch method
    // returned to us here should be harmless and not actually dispatch
    // anything.
    a.dispose();
    assert(!a.disposed);

    // Since resource was requested, it should stick around through a single
    // round of garbage collection.
    resources.collect();
    assert(!a.disposed);

    // If we keep requesting the resource, it should not be garbage collected.
    resources.get<ReturnType<typeof makeA>>("/A");
    resources.collect();
    assert(!a.disposed);

    // If we let it go stale, it should be collected.
    resources.collect();
    assert(a.disposed);
  });

  it("Promise dispose check.", async () => {
    const resources = makeResources();

    startLatch.signal();
    const c = await resources.get<ReturnType<typeof makeC>>("/C");
    assert.equal(c.disposed, false);
    // The resource system manages resource lifetimes, so the dispatch method
    // returned to us here should be harmless and not actually dispatch
    // anything.
    c.dispose();
    assert(!c.disposed);

    // Since resource was requested, it should stick around through a single
    // round of garbage collection.
    resources.collect();
    assert(!c.disposed);

    // If we keep requesting the resource, it should not be garbage collected.
    void resources.get<ReturnType<typeof makeC>>("/C");
    resources.collect();
    assert(!c.disposed);

    // If we let it go stale, it should be collected.
    resources.collect();
    assert(c.disposed);
  });

  it("Disposed dependency check.", async () => {
    const resources = makeResources();

    let b: ReturnType<typeof makeB> | undefined =
      resources.get<ReturnType<typeof makeB>>("/B");
    assert(!b.disposed);

    // Since resource was requested, it should stick around through a single
    // round of garbage collection.
    resources.collect();
    assert(!b.disposed);

    // If we keep requesting the resource, it should not be garbage collected.
    b = resources.get<ReturnType<typeof makeB>>("/B");
    resources.collect();
    assert(!b.disposed);
    assert(!b.dep.disposed);

    // If we let it go stale, it should be collected.
    b = resources.cached<ReturnType<typeof makeB>>("/B");
    assert(b);
    resources.collect();
    assert(!b.disposed);
    assert(!b.dep.disposed);

    b = resources.cached<ReturnType<typeof makeB>>("/B");
    assert(b);
    resources.collect();
    assert(!b.disposed);
    assert(!b.dep.disposed);
  });

  it("Cached dependencies stay live.", async () => {
    const resources = makeResources();

    startLatch.signal();
    const e = await resources.get<ReturnType<typeof makeE>>("/E");
    assert(!e.disposed);
    assert(!e.dep.disposed);
    assert(!e.dep.dep.disposed);

    // Shouldn't need to await anything after this.
    startLatch.reset();

    resources.collect();
    let eCached = resources.cached<ReturnType<typeof makeE>>("/E");
    assert(eCached);
    assert(!eCached.disposed);
    assert(!eCached.dep.disposed);
    assert(!eCached.dep.dep.disposed);

    resources.collect();
    eCached = resources.cached<ReturnType<typeof makeE>>("/E");
    assert(eCached);
    resources.collect();
    resources.collect();
    eCached = resources.cached<ReturnType<typeof makeE>>("/E");
    assert(!eCached);
  });

  it("Cached transitive dependencies stay live.", async () => {
    const resources = makeResources();

    startLatch.signal();
    await resources.get<ReturnType<typeof makeE>>("/E");

    // Don't let any more promises proceed after this point.
    startLatch.reset();

    // Invalidate a downstream dependency of E.
    resources.collect();
    resources.invalidate("/C");
    let eCached = resources.cached<ReturnType<typeof makeE>>("/E");
    assert(eCached);
    assert(!eCached.disposed);
    assert(!eCached.dep.disposed);
    assert(!eCached.dep.dep.disposed);

    resources.collect();
    eCached = resources.cached<ReturnType<typeof makeE>>("/E");
    assert(eCached);
    assert(!eCached.disposed);
    assert(!eCached.dep.disposed);
    assert(!eCached.dep.dep.disposed);

    resources.collect();
  });

  it("Cached nodes keep old value dependencies.", async () => {
    const resources = makeResources();

    startLatch.signal();
    latchFWait.signal();
    await resources.get<ReturnType<typeof makeF>>("/F");

    // Prevent the next build of "/F" from ever completing, so the build above
    // will be cached.
    latchFWait.reset();

    // At this point, all "/F" dependencies should all be generated. Now invalidate
    // them, and re-build them.
    resources.invalidate("/C");
    const e = await resources.get<ReturnType<typeof makeE>>("/E");
    assert(!e.disposed);
    assert(!e.dep.disposed);
    assert(!e.dep.dep.disposed);

    const fCached = resources.cached<ReturnType<typeof makeF>>("/F");
    assert(fCached);
    assert(!fCached.disposed);
    assert(!fCached.dep.disposed);
    assert(!fCached.dep.dep.disposed);
    assert(!fCached.dep.dep.dep.disposed);
  });
  it("Dependend nodes invalidated mid-build.", async () => {
    const resources = makeResources();

    startLatch.signal();
    const fPromise = resources.get<ReturnType<typeof makeF>>("/F");

    // Okay, we have a build started, advance until its build is almost done,
    // including some of its dependencies.
    await latchFSignal.wait();

    // At this point, all "/F" dependencies should all be generated. Now
    // invalidate them, and re-build them.
    resources.invalidate("/C");
    const e = await resources.get<ReturnType<typeof makeE>>("/E");
    assert(!e.disposed);
    assert(!e.dep.disposed);
    assert(!e.dep.dep.disposed);

    // Now complete the original "/F" build.
    latchFWait.signal();
    const f = await fPromise;
    assert(!f.disposed);
    assert(!f.dep.disposed);
    assert(!f.dep.dep.disposed);
    assert(!f.dep.dep.dep.disposed);
  });

  it("Invalidation mid-build does not preserve mid-build deps.", async () => {
    const resources = makeResources();

    startLatch.signal();
    const fPromise = resources.get<ReturnType<typeof makeF>>("/F");
    await latchFSignal.wait();
    startLatch.reset(); // Prevent subsequent builds of "/F" from starting.

    resources.invalidate("/C");

    resources.collect();

    let fCached = resources.cached<ReturnType<typeof makeF>>("/F");
    assert(!fCached); // Won't be ready until we signal the latch.

    // Expected that "/F" will be preserved, but its dependencies will not.
    resources.collect();

    // Let the original "/F" complete.
    latchFWait.signal();

    const f = await fPromise;
    assert(!f.disposed);
    assert(!f.dep.disposed);
    assert(!f.dep.dep.disposed);
    assert(!f.dep.dep.dep.disposed);

    fCached = resources.cached<ReturnType<typeof makeF>>("/F");
    assert(fCached);
    assert(!fCached.disposed);
    assert(!fCached.dep.disposed);
    assert(!fCached.dep.dep.disposed);
    assert(!fCached.dep.dep.dep.disposed);
  });
});

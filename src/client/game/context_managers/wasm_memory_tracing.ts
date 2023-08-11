import type { EarlyClientContext } from "@/client/game/context";
import type { RegistryLoader } from "@/shared/registry";
import { reduceMap } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import { cloneDeep } from "lodash";

// Setup hooks for recording WASM allocations and deallocations.
// For more information see:
//   https://www.notion.so/illinc/Wasm-Memory-Leak-Detection-4063947a231248ada3aa33ffd58b2611

export interface StackTraceInfo {
  // The stacktrace that this entry represents.
  stackTrace: string;
  // The number of allocations made for this stacktrace.
  count: number;
  // Total bytes currently allocated for this stacktrace.
  bytes: number;
}

export interface AllocationSnapshot {
  allocations: (StackTraceInfo & { stackTraceId: number })[];
}

function filterStackTrace(stackTrace: string) {
  const i = stackTrace.indexOf("emscripten_trace_record_");
  if (i != -1) {
    stackTrace = stackTrace.substring(stackTrace.indexOf("\n", i) + 1);
  }

  // Hide paths from URLs to make the log more readable
  stackTrace = stackTrace.replace(
    /@((file)|(http))[\w:\/\.]*\/([\w\.]*)/g,
    "@$4"
  );
  return stackTrace;
}

function getOrSetDefault<K, V>(m: Map<K, V>, k: K, d: () => V): V {
  const value = m.get(k);
  if (value === undefined) {
    const v = d();
    m.set(k, v);
    return v;
  } else {
    return value;
  }
}

export class AllocationSnapshot {
  private stackTraceToId: Map<string | undefined, number> = new Map();
  private allocationsByStackTraceId: Map<number, StackTraceInfo> = new Map();
  private allocationsByPtr: Map<
    number,
    { stackTraceId: number; size: number; id: number }
  > = new Map();
  private nextStackTraceId = 0;
  private nextAllocationId = 0;

  constructor() {}

  clone(): AllocationSnapshot {
    const cloned = new AllocationSnapshot();
    cloned.stackTraceToId = cloneDeep(this.stackTraceToId);
    cloned.allocationsByStackTraceId = cloneDeep(
      this.allocationsByStackTraceId
    );
    cloned.allocationsByPtr = cloneDeep(this.allocationsByPtr);
    cloned.nextStackTraceId = this.nextStackTraceId;
    return cloned;
  }

  addAllocation(ptr: number, size: number, stackTrace: string | undefined) {
    if (!ptr) {
      return;
    }

    const stackTraceId = getOrSetDefault(
      this.stackTraceToId,
      stackTrace,
      () => ++this.nextStackTraceId
    );

    const allocationStackTraces = getOrSetDefault(
      this.allocationsByStackTraceId,
      stackTraceId,
      () => ({
        stackTrace: stackTrace,
        count: 0,
        bytes: 0,
      })
    );
    allocationStackTraces.bytes += size;
    allocationStackTraces.count += 1;

    const allocationId = this.nextAllocationId++;
    this.allocationsByPtr.set(ptr, { stackTraceId, size, id: allocationId });
  }

  removeAllocation(ptr: number) {
    if (!ptr) {
      return;
    }
    const alloc = this.allocationsByPtr.get(ptr);
    if (!alloc) {
      return;
    }

    const stackTraceInfo = this.allocationsByStackTraceId.get(
      alloc.stackTraceId
    )!;
    stackTraceInfo.bytes -= alloc.size;
    stackTraceInfo.count -= 1;

    if (stackTraceInfo.count == 0) {
      this.allocationsByStackTraceId.delete(alloc.stackTraceId);
      //this.stackTraceToId.delete(stackTraceInfo.stackTrace);
    }
    this.allocationsByPtr.delete(ptr);
  }

  // Create an allocation if it doesn't exist, otherwise adjust the existing
  // size delta.
  adjustAllocation(
    ptr: number,
    sizeDelta: number,
    stackTrace: string | undefined
  ) {
    if (!ptr) {
      return;
    }

    const alloc = this.allocationsByPtr.get(ptr);
    if (!alloc) {
      this.addAllocation(ptr, sizeDelta, stackTrace);
      return;
    }

    this.removeAllocation(ptr);

    alloc.size += sizeDelta;
    if (alloc.size !== 0) {
      // Add the allocation back with the size difference applied.
      this.addAllocation(ptr, sizeDelta, stackTrace);
    }
  }

  getStackTrace(stackTraceId: number) {
    return this.allocationsByStackTraceId.get(stackTraceId)?.stackTrace;
  }

  getAllocations() {
    return this.allocationsByPtr;
  }

  getAllocationsByStackTrace() {
    return Array.from(this.allocationsByStackTraceId.values());
  }

  computeTotalAllocated() {
    return reduceMap(0, this.allocationsByPtr, (sum, v, _k) => sum + v.size);
  }
}

function allocationsIdSet(x: AllocationSnapshot) {
  return new Set(Array.from(x.getAllocations(), ([_addr, alloc]) => alloc.id));
}

export function subSnapshots(
  a: AllocationSnapshot,
  b: AllocationSnapshot
): AllocationSnapshot {
  const result = a.clone();
  const byId = allocationsIdSet(a);

  Array.from(b.getAllocations().entries()).forEach(([ptr, info]) => {
    if (byId.has(info.id)) {
      result.adjustAllocation(
        ptr,
        -info.size,
        b.getStackTrace(info.stackTraceId)
      );
    }
  });
  return result;
}

// Returns a snapshot A filtered to contain only entries that are present in
// snapshot B.
export function intersectSnapshots(
  a: AllocationSnapshot,
  b: AllocationSnapshot
): AllocationSnapshot {
  const result = a.clone();
  const byId = allocationsIdSet(b);
  Array.from(a.getAllocations().entries()).forEach(([ptr, info]) => {
    if (!byId.has(info.id)) {
      result.removeAllocation(ptr);
    }
  });
  return result;
}

interface MallocHooks {
  onMalloc?: (ptr: number, size: number) => void;
  onFree?: (ptr: number) => void;
  onRealloc?: (oldAddress: number, newAddress: number, size: number) => void;
}

export class WasmAllocationTracing {
  private currentState = new AllocationSnapshot();

  constructor(voxeloo: VoxelooModule & MallocHooks) {
    const getStackTrace = () => {
      const rawStackTrace = new Error().stack?.toString();
      return rawStackTrace ? filterStackTrace(rawStackTrace) : undefined;
    };
    // Install our allocation hooks.
    const onMalloc = (ptr: number, size: number) => {
      this.currentState.addAllocation(ptr, size, getStackTrace());
    };
    voxeloo.onMalloc = onMalloc;
    const onFree = (ptr: number) => {
      this.currentState.removeAllocation(ptr);
    };
    voxeloo.onFree = onFree;
    voxeloo.onRealloc = (
      oldAddress: number,
      newAddress: number,
      size: number
    ) => {
      this.currentState.removeAllocation(oldAddress);
      this.currentState.addAllocation(newAddress, size, getStackTrace());
    };
  }

  getSnapshot(): AllocationSnapshot {
    return this.currentState.clone();
  }
}

export async function loadTracing(
  loader: RegistryLoader<EarlyClientContext>
): Promise<WasmAllocationTracing | undefined> {
  const clientConfig = await loader.get("clientConfig");
  if (!clientConfig.wasmMemoryTracing) {
    return;
  }
  return new WasmAllocationTracing(await loader.get("voxeloo"));
}

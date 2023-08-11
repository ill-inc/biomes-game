import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { CKButton } from "@/client/components/system/CKButton";
import type {
  AllocationSnapshot,
  WasmAllocationTracing,
} from "@/client/game/context_managers/wasm_memory_tracing";
import {
  intersectSnapshots,
  subSnapshots,
} from "@/client/game/context_managers/wasm_memory_tracing";
import { ok } from "assert";
import { useReducer, useState } from "react";

// For more information see:
//   https://www.notion.so/illinc/Wasm-Memory-Leak-Detection-4063947a231248ada3aa33ffd58b2611

type SnapshotElement = {
  index: number;
  time: Date;
  size: number;
  snapshot: AllocationSnapshot;
};

// Maintain our list of snapshots in a global.  This is a debuggy feature so
// it's fine if this list just grows forever.
const globalSnapshots: SnapshotElement[] = [];

function getSnapshotListReducer(tracing: WasmAllocationTracing) {
  return (list: SnapshotElement[]): SnapshotElement[] => {
    if (list.length === globalSnapshots.length) {
      // Update our globally-backed snapshots list with a new snapshot.
      const snapshot = tracing.getSnapshot();
      const snapshotElement = {
        index: list.length,
        time: new Date(),
        size: snapshot.computeTotalAllocated(),
        snapshot: snapshot,
      };
      globalSnapshots.push(snapshotElement);
    }

    return [...globalSnapshots];
  };
}

export const EXPORT_TYPES = [
  // Exports as a summary of the top N callstacks for outstanding allocations.
  "summary",
  // Exports as a callstack + outstanding allocations per-line format, such
  // that it can be ingested by the flamegraph script and turned into a
  // flamegraph svg.
  //   https://github.com/brendangregg/FlameGraph
  "folded",
] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

// Keep track of this globally so that the user's choice doesn't keep flipping
// back.
let globalExportType: ExportType = "summary";
function setGlobalExportType(
  exportType: ExportType,
  newExportType: ExportType
): ExportType {
  globalExportType = newExportType;
  return newExportType;
}

function titleForSnapshot(snapshot: SnapshotElement): string {
  return `${snapshot.time.toLocaleTimeString()} (${snapshot.size} bytes)`;
}

function getTopCallstacksLog(snapshot: AllocationSnapshot, topN: number) {
  const resultsByStackTrace = snapshot.getAllocationsByStackTrace();

  const sortedResults = resultsByStackTrace.sort((a, b) => b.bytes - a.bytes);

  let output = `Number of unique allocation stack traces: ${sortedResults.length}\n\n`;

  for (let i = 0; i < topN && i < sortedResults.length; ++i) {
    output = output.concat(`Entry ${i}\n`);
    const alloc = sortedResults[i];
    output = output.concat(`  Allocated bytes: ${alloc.bytes}\n`);
    output = output.concat(`  Count: ${alloc.count}\n`);
    output = output.concat(`${alloc.stackTrace}\n`);
    output = output.concat("\n");
  }

  return output;
}

function getFoldedStackOutput(snapshot: AllocationSnapshot) {
  const resultsByStackTrace = snapshot.getAllocationsByStackTrace();

  const sortedResults = resultsByStackTrace.sort((a, b) => b.bytes - a.bytes);

  const stacks: string[] = sortedResults.map((alloc) => {
    const foldedStack = alloc.stackTrace.replaceAll("    at ", "").split("\n");
    return `${foldedStack.reverse().join(";")} ${alloc.bytes}`;
  });

  return stacks.join("\n");
}

function downloadTextAsFile(text: string, filename: string) {
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
  a.download = filename;
  a.click();
}

function downloadSnapshot(
  snapshot: AllocationSnapshot,
  exportType: ExportType,
  filenameBase: string
) {
  switch (exportType) {
    case "folded":
      downloadTextAsFile(
        getFoldedStackOutput(snapshot),
        `${filenameBase}_folded.txt`
      );
      break;
    case "summary":
      downloadTextAsFile(
        getTopCallstacksLog(snapshot, 5),
        `${filenameBase}_summary.txt`
      );
      break;
  }
}

export function WasmMemoryTracing() {
  const { tracing } = useClientContext();
  if (!tracing) {
    return <></>;
  }

  const [snapshots, takeSnapshot] = useReducer(
    getSnapshotListReducer(tracing),
    [...globalSnapshots]
  );

  const [exportType, setExportType] = useReducer(
    setGlobalExportType,
    globalExportType
  );

  const [selected, setSelected] = useState([] as string[]);

  return (
    <div className="wasm-memory-tracing">
      <h1>Memory Tracing</h1>

      <div className="panel">
        <h2>Snapshots</h2>
        <select
          name="snapshots"
          className="snapshot-select"
          multiple
          onChange={(e) => {
            setSelected(
              Array.from(e.target.selectedOptions, (option) => option.value)
            );
          }}
          value={selected}
        >
          {snapshots.map((x) => {
            const title = titleForSnapshot(x);
            return (
              <option key={x.index} value={x.index}>
                {title}
              </option>
            );
          })}
        </select>

        <div>
          <CKButton
            onClick={() => {
              takeSnapshot();
            }}
          >
            Take Snapshot
          </CKButton>
        </div>
      </div>

      <div className="panel">
        <h2>Exporting</h2>
        <div>
          Export type:
          <div className="export-options">
            {EXPORT_TYPES.map((x) => (
              <label key={x}>
                <input
                  type="radio"
                  value={x}
                  checked={x === exportType}
                  onChange={(e) => {
                    setExportType(e.target.value as ExportType);
                  }}
                />
                {x}
              </label>
            ))}
          </div>
        </div>
        <div>
          <CKButton
            onClick={() => {
              ok(selected.length === 1);
              const selectedSnapshot = snapshots[parseInt(selected[0])];
              downloadSnapshot(
                selectedSnapshot.snapshot,
                exportType,
                "snapshot_single"
              );
            }}
            disabled={selected.length !== 1}
          >
            Save Snapshot
          </CKButton>
        </div>
        <div>
          <CKButton
            onClick={() => {
              // Implements the "three snapshot technique", where we look at the
              // set of allocations that occurred between snapshots 1 and 2, and
              // then check to see how many of those still persist in snapshot
              // 3, and export those as a snapshot itself.
              // The idea is that all long-lived allocations will be made before
              // snapshot 1, so that between snapshots 1 and 2 all allocations
              // are temporary, and so between snapshots 2 and 3 the temporary
              // allocations are all eventually freed again. Thus, you expect
              // the interesection of snapshot 3 compared to
              // (snapshot 2 - snapshot 1) to be empty, and if it's not the
              // allocations contained are presumably leaks.
              //   https://commandlinefanatic.com/cgi-bin/showarticle.cgi?article=art038
              ok(selected.length === 3);
              const selectedSnapshots = selected.map(
                (x) => snapshots[parseInt(x)]
              );
              const diffSnapshot = subSnapshots(
                selectedSnapshots[1].snapshot,
                selectedSnapshots[0].snapshot
              );
              const interesectedSnapshot = intersectSnapshots(
                diffSnapshot,
                selectedSnapshots[2].snapshot
              );

              downloadSnapshot(
                interesectedSnapshot,
                exportType,
                "snapshot_three"
              );
            }}
            disabled={selected.length !== 3}
          >
            Save Three Snapshots
          </CKButton>
        </div>
      </div>
    </div>
  );
}

export default WasmMemoryTracing;

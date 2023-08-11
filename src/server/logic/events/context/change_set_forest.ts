import type {
  ChangeSet,
  FinalizedChangeSet,
} from "@/server/logic/events/context/change_set";
import { DisjointSet } from "@/shared/data_structures/disjoint_set";
import type { BiomesId } from "@/shared/ids";

export class ChangeSetForest<TEvent> {
  private readonly disjoint: ChangeSet<TEvent>[] = [];
  private readonly changeSets = new Map<BiomesId, ChangeSet<TEvent>>();
  private readonly ds = new DisjointSet<BiomesId>();

  add(proposed: ChangeSet<TEvent>) {
    if (proposed.versionMap.size === 0) {
      // Nothing to merge with.
      this.disjoint.push(proposed);
      return;
    }

    // Choose an ID to use as the pivot, it will be used to lookup
    // and union in the disjoint set.
    const [pivot] = proposed.versionMap.keys();

    // Find all change sets that overlap with our current one's versions
    // and merge them into it.
    const roots = new Set<BiomesId>();
    for (const id of proposed.versionMap.keys()) {
      const root = this.ds.find(id);
      if (root !== pivot) {
        roots.add(root);
      }
      const set = this.changeSets.get(root);
      if (set !== undefined) {
        proposed.merge(set);
        this.changeSets.delete(root);
      }
    }

    // Now merge all these trees in the disjoint set.
    for (const root of roots) {
      this.ds.union(pivot, root);
    }

    // Finally mark this as the owner set for that root.
    this.changeSets.set(this.ds.find(pivot), proposed);
  }

  build(): FinalizedChangeSet<TEvent>[] {
    const finalized: FinalizedChangeSet<TEvent>[] = [];
    for (const set of this.disjoint) {
      const fcs = set.build();
      if (fcs !== undefined) {
        finalized.push(fcs);
      }
    }
    for (const set of this.changeSets.values()) {
      const fcs = set.build();
      if (fcs !== undefined) {
        finalized.push(fcs);
      }
    }
    return finalized;
  }
}

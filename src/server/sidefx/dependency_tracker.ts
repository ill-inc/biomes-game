import { UniqueMultiMap } from "@/shared/util/collections";

// Map to track the support relationships between entities. Supports are
// entities that are used to determine the properties of another entity. For example,
// a player's team is a support of the creatorTeam ACL, linked by createdBy. meaning:
//  A[creatorAcl] -> B -> C -> D[playerTeam]
// Where each link is a 'support' defined by the createdBy component.
// The support of A[creatorAcl] is A, B, C, D
// This is the mechanism by which we can use to listen to changes to A, B, C, or D
// and realize that A must be recomputed.
export class InvalidationDependencyTracker<Key, Dep> {
  private readonly dependencyToKey = new UniqueMultiMap<Dep, Key>();
  private readonly keyToDependencies = new Map<Key, Set<Dep>>();

  removeKey(key: Key) {
    const deps = this.keyToDependencies.get(key);
    if (deps) {
      for (const dep of deps) {
        this.dependencyToKey.delete(dep, key);
      }
    }
    this.keyToDependencies.delete(key);
  }

  set(key: Key, newDependencies: Set<Dep>) {
    const oldDeps = this.keyToDependencies.get(key);
    this.keyToDependencies.set(key, newDependencies);

    if (oldDeps) {
      for (const dep of oldDeps) {
        if (!newDependencies.has(dep)) {
          this.dependencyToKey.delete(dep, key);
        }
      }
    }
    for (const dep of newDependencies) {
      this.dependencyToKey.add(dep, key);
    }
  }

  getKeys(dep: Dep) {
    return this.dependencyToKey.get(dep);
  }

  hasKey(key: Key) {
    return this.keyToDependencies.has(key);
  }
}

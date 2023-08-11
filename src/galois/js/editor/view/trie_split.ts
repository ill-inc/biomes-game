export type TreeNode<TreeLeaf> = [string, TreeNode<TreeLeaf>[] | TreeLeaf];

// Helper function to convert a tree of "/"-separated paths into a tree
// of nodes such that paths that share a prefix appear under the same node.
// This function basically "trie-ifies" a tree.
export function trieSplitBySlash<T>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  // A map where the key is the first token before the slash in a tree node
  // name, and the values are a list of all nodes that share this first
  // token.
  const byFirst = new Map<string, TreeNode<T>[]>();
  // A mapping of node name to leaf nodes.
  const leaves = new Map<string, T>();

  // Helper function to populate byFirst and leaves.
  function addToByFirst(node: TreeNode<T>) {
    if (Array.isArray(node[1])) {
      let existing = byFirst.get(node[0]);
      if (existing == undefined) {
        existing = [];
      }
      byFirst.set(node[0], [...existing, ...node[1]]);
    } else {
      leaves.set(node[0], node[1]);
    }
  }

  // For each root node in our input, filter it into either byFirst or
  // leaves.
  nodes.forEach((n) => {
    const splitPath = n[0].split("/");
    if (splitPath.length == 1) {
      addToByFirst(n);
    } else {
      const restPath = splitPath.slice(1).join("/");
      const prefixNode: TreeNode<T> = [splitPath[0], [[restPath, n[1]]]];
      addToByFirst(prefixNode);
    }
  });

  // Okay, our byFirst and leaves are populated. byFirst contains all entries
  // keyed by the first component of their paths, so we recurse on that and then
  // turn it into a list
  const internalNodes = Array.from(byFirst.entries()).map(([k, v]) => {
    const bySecond = trieSplitBySlash<T>(v);
    if (bySecond.length == 1) {
      // Coalesce paths that only have one child into a single node.
      const n = bySecond[0];
      return [`${k}/${n[0]}`, n[1]];
    } else {
      return [k, bySecond];
    }
  }) as TreeNode<T>[];

  const leafNodes = Array.from(leaves.entries()) as TreeNode<T>[];

  // Sort the results alphabetically.
  return [...internalNodes, ...leafNodes].sort((a, b) => {
    if (a[0] < b[0]) {
      return -1;
    } else if (a[0] > b[0]) {
      return 1;
    } else {
      return 0;
    }
  });
}

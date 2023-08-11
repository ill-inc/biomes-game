import type { AssetServerConnection } from "@/galois/editor/view/api";
import type { ContentPage } from "@/galois/editor/view/editor_content";
import { getEditorAssets } from "@/galois/editor/view/editor_content";
import type { TreeNode } from "@/galois/editor/view/trie_split";
import { DownOutlined } from "@ant-design/icons";
import { Tree } from "antd";
import "antd/dist/antd.css";
import type { DataNode } from "rc-tree/lib/interface";
import React, { useEffect } from "react";

// Converts our abstract "editor assets tree" into a Ant Design tree ready
// for presentation as a UI tree component.
function contentTreeToAntdTree(
  contentTree: TreeNode<ContentPage>[],
  prefix = ""
): [DataNode[], Map<string, ContentPage>] {
  let keyMap = new Map<string, ContentPage>();
  const antdTree = contentTree.map((n) => {
    const fullKey = prefix === "" ? n[0] : `${prefix}/${n[0]}`;
    const antdNode: DataNode = {
      title: n[0],
      key: fullKey,
      selectable: !Array.isArray(n[1]),
    };
    if (Array.isArray(n[1])) {
      const [antdChildren, childKeyMap] = contentTreeToAntdTree(n[1], fullKey);
      antdNode["children"] = antdChildren;
      keyMap = new Map<string, ContentPage>([...keyMap, ...childKeyMap]);
    } else {
      keyMap.set(fullKey, n[1]);
    }
    return antdNode;
  });

  return [antdTree, keyMap];
}

export const ContentSelector: React.FunctionComponent<{
  setSelectedContentPage: (x?: ContentPage) => void;
  assetServer: AssetServerConnection;
}> = ({ setSelectedContentPage, assetServer }) => {
  const [editorAssets, setEditorAssets] = React.useState(
    [] as TreeNode<ContentPage>[]
  );

  useEffect(() => {
    void getEditorAssets(assetServer).then(setEditorAssets);
  }, []);

  const [antdTree, keyMap] = contentTreeToAntdTree(editorAssets);
  const onSelect = (selectedKeys: React.Key[], _: any) => {
    const key = selectedKeys[0];
    if (typeof key === "string") {
      setSelectedContentPage(keyMap.get(key));
    }
  };

  return (
    <div className="asset-selector">
      <h2>Assets</h2>
      <Tree
        onSelect={onSelect}
        blockNode
        switcherIcon={<DownOutlined />}
        treeData={antdTree}
      />
    </div>
  );
};

import { allAssets } from "@/galois/assets";
import type { Asset } from "@/galois/lang";
import { Select } from "antd";
import "antd/dist/antd.css";
import React from "react";

type SetAssetFn = (data: Asset) => void;

export const Nav: React.FunctionComponent<{ setAsset: SetAssetFn }> = ({
  setAsset,
}) => {
  return (
    <div className="nav">
      <Select
        showSearch
        style={{ width: 400 }}
        placeholder="Choose asset..."
        optionFilterProp="children"
        onSelect={(_: string, option: { data: Asset }) => setAsset(option.data)}
      >
        {allAssets().map(([name, data]) => (
          <Select.Option value={name} data={data} key={name}>
            {name}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
};

import "antd/dist/antd.css";

import { BlockTool } from "@/client/components/art/blocks/BlockTool";
import { DefaultTool } from "@/client/components/art/DefaultTool";
import { FloraTool } from "@/client/components/art/florae/FloraTool";
import { GlassTool } from "@/client/components/art/glass/GlassTool";
import styles from "@/client/styles/admin.art.module.css";
import React, { useState } from "react";

const TOOLS = {
  block: () => <BlockTool />,
  glass: () => <GlassTool />,
  flora: () => <FloraTool />,
};

export type Tool = keyof typeof TOOLS;

const NavLink: React.FunctionComponent<{
  children: string;
  onClick: () => void;
}> = ({ children, onClick }) => {
  return (
    <a
      onClick={(e) => {
        onClick();
        e.preventDefault();
      }}
    >
      {children}
    </a>
  );
};

export const ArtTool: React.FunctionComponent<{ initialTool?: Tool }> = ({
  initialTool,
}) => {
  const [tool, setTool] = useState<Tool | undefined>(initialTool);

  return (
    <div className={`${styles["page"]} ${styles["stack-col"]}`}>
      <div className={`${styles["header"]} ${styles["item-fixed"]}`}>
        {Object.keys(TOOLS).map((tool) => (
          <NavLink
            key={tool}
            onClick={() => {
              setTool(tool as Tool);
              window.history.pushState({}, "", `/art/${tool}`);
            }}
          >
            {tool}
          </NavLink>
        ))}
      </div>
      <div className={`${styles["content"]} ${styles["item-grows"]}`}>
        {tool ? TOOLS[tool]() : <DefaultTool />}
      </div>
    </div>
  );
};

export default ArtTool;

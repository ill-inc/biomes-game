import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import type { PropsWithChildren, ReactNode } from "react";
import React, { useEffect, useRef } from "react";

export const Highlight: React.FunctionComponent<
  PropsWithChildren<{
    language: string;
    children: ReactNode;
  }>
> = ({ language, children }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current!;
    hljs.highlightBlock(element);
  });

  return (
    <pre className={"highlight"}>
      <code className={language} ref={ref}>
        {children}
      </code>
    </pre>
  );
};

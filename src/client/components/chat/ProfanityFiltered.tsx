import { filterProfanity } from "@/shared/util/profanity";
import type { PropsWithChildren, ReactNode } from "react";
import React from "react";

export const ProfanityFiltered: React.FunctionComponent<PropsWithChildren<{}>> =
  React.memo(({ children }) => {
    const processChildren = (children: ReactNode): ReactNode => {
      return React.Children.map(children, (child) => {
        // If the child is a valid React element, don't touch it
        if (React.isValidElement(child)) {
          // Recursively process this child's children
          return React.cloneElement(
            child,
            {},
            processChildren(child.props.children)
          );
        }

        // If the child is a string or number (i.e., text), apply the profanity filter
        if (typeof child === "string" || typeof child === "number") {
          return filterProfanity(child.toString());
        }

        // Otherwise, just return the child as is
        return child;
      });
    };

    return <>{processChildren(children)}</>;
  });

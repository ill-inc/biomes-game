import styles from "@/client/styles/admin.module.css";
import { makeJsonSafe } from "@/shared/json";
import dynamic from "next/dynamic";
import React from "react";
import type { ReactJsonViewProps } from "react-json-view";

const DynamicReactJson = dynamic(import("react-json-view"), { ssr: false });

export const AdminReactJSON: React.FunctionComponent<ReactJsonViewProps> = (
  props
) => {
  return (
    <div className={styles["admin-react-json"]}>
      <DynamicReactJson
        theme="google"
        {...props}
        src={makeJsonSafe(props.src)}
      />
    </div>
  );
};

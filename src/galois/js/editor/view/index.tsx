import { App } from "@/galois/editor/view/components/App";
import "@/galois/editor/view/styles.css";
import React from "react";
import * as ReactDOM from "react-dom";

const Index: React.FunctionComponent<{}> = ({}) => {
  return <App />;
};

ReactDOM.render(<Index />, document.getElementById("app"));

import React from "react";

export const GraphSearchContext = React.createContext<{
  search: string;
  setSearch: (s: string) => void;
  showNonQuests: boolean;
  setShowNonQuests: (s: boolean) => void;
}>({
  search: "",
  setSearch: () => {},
  showNonQuests: false,
  setShowNonQuests: () => {},
});

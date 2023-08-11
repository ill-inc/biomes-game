import { createContext, useContext } from "react";

export type LoginRelatedControllerContext = {
  showSignUp: () => unknown;
  showLogin: () => unknown;
  showingModal: boolean;
};

export const LoginRelatedControllerContext = createContext(
  {} as unknown as LoginRelatedControllerContext
);

export const useLoginRelatedControllerContext = () =>
  useContext(LoginRelatedControllerContext);

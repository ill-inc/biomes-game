import type { PropsWithChildren } from "react";

export const ChromelessModal: React.FunctionComponent<
  PropsWithChildren<{
    onClose?: () => any;
    extraClassNames?: string;
  }>
> = ({ extraClassNames, onClose, children }) => {
  return (
    <div className={`chromeless-modal ${extraClassNames}`}>
      <div
        className="chromeless-modal-closer"
        onClick={() => {
          onClose?.();
        }}
      />
      {children}
    </div>
  );
};

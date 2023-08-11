import type { PropsWithChildren } from "react";

export const ShadowedImage: React.FunctionComponent<
  PropsWithChildren<{
    onClick?: (e: React.MouseEvent) => any;
    onDoubleClick?: () => any;
    extraClassNames?: string;
    src?: string;
    imgClassName?: string;
    accentColor?: string;
  }>
> = ({
  onClick,
  onDoubleClick,
  extraClassNames,
  src,
  imgClassName,
  accentColor,
  children,
}) => {
  return (
    <div
      className={`img-box-shadow-wrapper ${extraClassNames}`}
      onClick={(e) => {
        onClick?.(e);
      }}
      onDoubleClick={() => {
        onDoubleClick?.();
      }}
      style={{ backgroundColor: accentColor ?? undefined }}
    >
      <img className={`${imgClassName} max-w-none`} src={src} />
      <div className="b-shadow-inner" />
      {children}
    </div>
  );
};

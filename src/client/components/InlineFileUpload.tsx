import type { InputHTMLAttributes, MutableRefObject } from "react";
import React from "react";

// eslint-disable-next-line react/display-name
export const InlineFileUpload = React.forwardRef<
  HTMLInputElement,
  {
    onUpload: (file: File) => void;
    extraInputAttributes?: InputHTMLAttributes<HTMLInputElement>;
  }
>(({ onUpload, extraInputAttributes }, ref) => {
  return (
    <input
      type="file"
      style={{ display: `none` }}
      ref={ref}
      onChange={(e) => {
        e.preventDefault();
        void (async () => {
          const files = (ref as MutableRefObject<HTMLInputElement>)?.current
            ?.files;
          if (files && files.length > 0) {
            const file = files[0];
            onUpload(file);
          }
        })();
      }}
      {...extraInputAttributes}
    />
  );
});

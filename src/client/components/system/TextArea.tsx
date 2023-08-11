import type { PropsWithChildren } from "react";
import React, { useEffect, useRef } from "react";

export type TextAreaProps = PropsWithChildren<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> & {
  autoSize?: boolean;
};

// Text area that automatically resizes to fit its contents.
export const TextArea: React.FunctionComponent<TextAreaProps> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (props.autoSize && ref.current) {
      ref.current.style.height = "0px";
      const scrollHeight = ref.current.scrollHeight + ref.current.offsetHeight;
      ref.current.style.height = `${scrollHeight}px`;
    }
  }, [ref.current?.value]);
  return (
    <textarea ref={ref} {...props}>
      {props.children}
    </textarea>
  );
};

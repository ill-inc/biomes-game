import type { DialogButtonProps } from "@/client/components/system/DialogButton";
import { DialogButton } from "@/client/components/system/DialogButton";
import type { ChangeEvent } from "react";

export const DialogInputWithButton: React.FunctionComponent<{
  value: string;
  onSubmit: () => any;
  onChange: (e: ChangeEvent<HTMLInputElement>) => any;
  disabledSubmit?: boolean;
  buttonText: string;
  formClassName?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  buttonProps?: DialogButtonProps;
  showSaveButton?: boolean;
}> = ({
  value,
  onSubmit,
  onChange,
  disabledSubmit,
  buttonText,
  formClassName,
  inputProps,
  buttonProps,
  showSaveButton = true,
}) => {
  return (
    <form
      className={`relative ${formClassName}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="text"
        value={value}
        placeholder="Comment"
        className="pr-6"
        onChange={onChange}
        {...inputProps}
      />

      {value && showSaveButton && (
        <DialogButton
          size="small"
          type="primary"
          disabled={disabledSubmit}
          extraClassNames="absolute right-0.4 top-1/2 -translate-y-1/2 w-max"
          onClick={() => {
            onSubmit();
          }}
          {...buttonProps}
        >
          {buttonText}
        </DialogButton>
      )}
    </form>
  );
};

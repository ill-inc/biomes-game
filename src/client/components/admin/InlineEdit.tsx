import type { KeyCode } from "@/client/game/util/keyboard";
import { useState } from "react";

export const InlineEdit: React.FunctionComponent<{
  type?: "text" | "number";
  permitEmpty?: boolean;
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onEditing?: (editing: boolean) => void;
}> = ({ type, permitEmpty, value, placeholder, onValueChange, onEditing }) => {
  const [editingValue, setEditingValue] = useState(value);
  return (
    <input
      type={type ?? "text"}
      value={editingValue}
      placeholder={placeholder}
      onChange={(e) => {
        setEditingValue(e.target.value);
        onEditing?.(true);
      }}
      onKeyDown={(e) => {
        const lk = e.code as KeyCode;
        if (lk === "Enter" || lk === "Escape") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBlur={(e) => {
        if (!permitEmpty && e.target.value.trim() === "") {
          setEditingValue(value);
        } else {
          onValueChange(e.target.value);
        }
        onEditing?.(false);
      }}
    />
  );
};

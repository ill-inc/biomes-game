import { Img } from "@/client/components/system/Img";
import styles from "@/client/styles/admin.bikkie.module.css";
import { useCallback, useState } from "react";
import editIcon from "/public/hud/icon-16-pencil.png";

export const EditableText: React.FunctionComponent<{
  className?: string;
  value: string;
  onChange: (value: string) => string | undefined;
  eraseOnEdit?: (value: string) => boolean;
}> = ({ className, value, onChange, eraseOnEdit }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [originalValue, setOriginalValue] = useState(value);
  const [error, setError] = useState<string | undefined>(undefined);

  const startEditing = useCallback(() => {
    setOriginalValue(value);
    setText(eraseOnEdit?.(value) ? "" : value);
    setError(undefined);
    setEditing(true);
  }, [value, eraseOnEdit]);

  return editing ? (
    <div className={className}>
      <input
        autoFocus
        type="text"
        value={text}
        placeholder={"Type and hit enter, or escape to cancel"}
        onChange={(e) => {
          setText(e.target.value);
          setError(onChange(e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !error) {
            setEditing(false);
          } else if (e.key === "Escape") {
            setEditing(false);
            onChange(originalValue);
          }
        }}
      />
      {error && <span className={styles["error"]}>{error}</span>}
    </div>
  ) : (
    <label className={className} onClick={startEditing}>
      {value}
      <Img src={editIcon.src} />
    </label>
  );
};

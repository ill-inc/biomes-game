import { all } from "@/shared/util/helpers";
import type { PropsWithChildren, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dropdownIcon from "/public/hud/icon-16-chevron-down.png";

export type DialogTypeaheadInputProps<T, Specials extends string[] = []> = {
  options: T[];
  getDisplayName: (option: T) => string;
  getThumbnail?: (option: T) => ReactNode;
  value: T | Specials[number] | undefined;
  onChange: (option: T | Specials[number] | undefined) => unknown;
  specialValues?: Specials;
  disabled?: boolean;
  extraClassNames?: string;
  nullable?: boolean;
  nullName?: string;
};

export const DialogTypeaheadInput = <T, Specials extends string[] = []>({
  options: inputOptions,
  value,
  getDisplayName,
  getThumbnail,
  onChange,
  specialValues,
  nullable,
  nullName,
  disabled,
  extraClassNames,
}: PropsWithChildren<DialogTypeaheadInputProps<T, Specials>>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleOptionsRef = useRef<HTMLUListElement>(null);
  const [visibleOptions, setVisibleOptions] = useState<(T | undefined)[]>([]);
  const options = useMemo(() => {
    if (nullable) {
      return [undefined, ...inputOptions];
    }
    return inputOptions;
  }, [inputOptions, nullable]);

  const wrapGetDisplayName = useCallback(
    (e: T | Specials[number] | undefined) => {
      if (specialValues?.includes(e as Specials[number])) {
        return e as Specials[number];
      }
      return e ? getDisplayName(e as T) : nullName ?? "";
    },
    [getDisplayName, nullName]
  );

  const waitForClickBlurDelay = 300;

  const [inputText, setInputText] = useState("");

  const matchRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const suppressBlur = useRef<boolean>(false);

  const resetToValue = useCallback(
    (v: typeof value) => {
      const selectedInput = options.find((e) => e === v);
      setInputText(
        v && specialValues?.includes(v as Specials[number])
          ? (v as Specials[number])
          : wrapGetDisplayName(selectedInput)
      );
    },
    [options, options.length]
  );
  const [selectedIdx, setSelectedIdx] = useState<undefined | number>();

  useEffect(() => {
    resetToValue(value);
    setSelectedIdx(undefined);
  }, [value, options, options.length]);

  const showMatchingOptions = useCallback(
    (keywords: string) => {
      const fuzzy = keywords.toLowerCase().split(/\s+/);
      const matchingOptions = options.filter((e) => {
        const toMatch = wrapGetDisplayName(e).toLowerCase();
        return all(fuzzy, (keyword) => toMatch.includes(keyword));
      });
      setVisibleOptions(matchingOptions);
    },
    [options, options.length]
  );

  const showMatchIn = useCallback(
    (keywords: string, delay: number) => {
      if (matchRef.current) {
        clearTimeout(matchRef.current);
        matchRef.current = undefined;
      }

      matchRef.current = setTimeout(() => {
        showMatchingOptions(keywords);
      }, delay);
    },
    [options, options.length]
  );

  useEffect(() => {
    const matchedItemIndex = visibleOptions.indexOf(value as T);
    setSelectedIdx(visibleOptions ? matchedItemIndex : undefined);
  }, [visibleOptions, visibleOptions.length]);

  const showingSpecials =
    visibleOptions.length === options.length && specialValues;

  const selectSpecialAtIdx = (idx: number) => {
    const val = specialValues?.[idx];
    onChange(val);
    setVisibleOptions([]);
    inputRef?.current?.blur();
  };

  const selectOptionAtIdx = (idx: number) => {
    const selectedInput = visibleOptions[idx];
    onChange(selectedInput);
    setVisibleOptions([]);
    inputRef?.current?.blur();
  };

  useEffect(() => {
    if (selectedIdx) {
      visibleOptionsRef?.current?.children[selectedIdx]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIdx]);

  return (
    <div className={`dialog-input-wrap ${extraClassNames ?? ""}`}>
      <input
        className="dialog-input w-full"
        style={{
          backgroundImage: `url("${dropdownIcon.src}")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
          backgroundSize: "16px",
        }}
        type="text"
        ref={inputRef}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIdx((i) => (i ?? -1) + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(0, (i ?? -1) - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIdx !== undefined) {
              suppressBlur.current = true;
              if (showingSpecials && selectedIdx < specialValues.length) {
                selectSpecialAtIdx(selectedIdx);
              } else {
                selectOptionAtIdx(
                  selectedIdx -
                    (showingSpecials ? specialValues?.length ?? 0 : 0)
                );
              }
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            resetToValue(value);
          }
        }}
        value={inputText}
        onBlur={() => {
          setTimeout(() => {
            if (suppressBlur.current) {
              suppressBlur.current = false;
              return;
            }
            if (inputText === "" && nullable) {
              onChange(undefined);
            }
            resetToValue(value);
            setVisibleOptions([]);
          }, waitForClickBlurDelay);
        }}
        onFocus={(e) => {
          const selectedInput = options.find((e) => e === value);
          if (
            inputText === "" ||
            inputText === wrapGetDisplayName(selectedInput) ||
            specialValues?.includes(inputText as Specials[number])
          ) {
            showMatchingOptions("");
          }

          e.target.select();
        }}
        onKeyUp={(e) => {
          if (e.key === "Escape") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        onChange={(e) => {
          setInputText(e.target.value);
          setVisibleOptions([]);
          showMatchIn(e.target.value, waitForClickBlurDelay);
        }}
      />

      {visibleOptions.length > 0 && (
        <ul className="typeahead-options" ref={visibleOptionsRef}>
          {showingSpecials &&
            specialValues?.map((e, i) => {
              return (
                <li
                  key={`${e}`}
                  className={selectedIdx === i ? "selected" : undefined}
                  onClick={(_ev) => {
                    suppressBlur.current = true;
                    selectSpecialAtIdx(i);
                  }}
                >
                  {e}
                </li>
              );
            })}
          {visibleOptions.map((e, i) => {
            const displayName = wrapGetDisplayName(e);
            const thumbnail = getThumbnail?.(e as T);
            return (
              <li
                key={`${displayName}-${i}`}
                className={`${
                  selectedIdx ===
                  i + (showingSpecials ? specialValues.length : 0)
                    ? "selected"
                    : undefined
                } flex items-center gap-0.4`}
                onClick={(_ev) => {
                  suppressBlur.current = true;
                  selectOptionAtIdx(i);
                }}
              >
                {thumbnail}
                {displayName}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

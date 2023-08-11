import React, { useEffect, useState } from "react";

export const SegmentedControl: React.FunctionComponent<{
  index?: number;
  onClick?: (index: number) => any;
  items: readonly string[];
}> = ({ index, onClick, items }) => {
  const [initialIndex, setInitialIndex] = useState<number | undefined>(index);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex ?? 0);

  useEffect(() => {
    if (index !== initialIndex) {
      // Index updated from outside this element
      setInitialIndex(index);
      if (index !== undefined && index !== selectedIndex) {
        setSelectedIndex(index);
      }
    }
  }, [index, initialIndex, selectedIndex]);

  return (
    <ul className="segmented-control">
      {items.map((item, i) => (
        <li
          key={i}
          onClick={(e) => {
            setSelectedIndex(i);
            e.preventDefault();
            e.stopPropagation();
            onClick?.(i);
          }}
          className={`${selectedIndex == i ? "selected" : ""}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

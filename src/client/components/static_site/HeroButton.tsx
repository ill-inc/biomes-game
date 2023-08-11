import { twMerge } from "tailwind-merge";

export const HeroButton: React.FunctionComponent<{
  onClick: () => any;
  extraClassNames: string;
  label: string;
}> = ({ onClick, extraClassNames, label }) => {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        `group relative flex-1 overflow-hidden rounded-[12px] py-[18px] text-center text-[24px] font-semibold no-underline shadow-[_inset_0_0_0_3px_rgba(255,255,255,0.2),0_4px_0_#2b112f] active:mb-[-4px] active:mt-[4px] active:shadow-[none] md:text-[24px]`,
        extraClassNames
      )}
      style={{
        textShadow: "0 0 2px rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.25)",
        border: "3px solid #2b112f",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100" />
      <span className="text-inherit">{label}</span>
    </button>
  );
};

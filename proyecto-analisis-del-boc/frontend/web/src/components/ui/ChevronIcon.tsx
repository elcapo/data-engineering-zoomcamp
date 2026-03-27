interface ChevronIconProps {
  expanded: boolean;
  className?: string;
}

export function ChevronIcon({ expanded, className = "" }: ChevronIconProps) {
  return (
    <svg
      className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

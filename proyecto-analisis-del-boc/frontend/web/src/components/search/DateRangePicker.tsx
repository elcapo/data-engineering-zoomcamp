"use client";

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rango de fechas</legend>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from ?? ""}
          onChange={(e) => onChange(e.target.value || undefined, to)}
          aria-label="Desde"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <span className="text-sm text-zinc-400">&ndash;</span>
        <input
          type="date"
          value={to ?? ""}
          onChange={(e) => onChange(from, e.target.value || undefined)}
          aria-label="Hasta"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
    </fieldset>
  );
}

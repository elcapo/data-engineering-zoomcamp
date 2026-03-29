"use client";

import { useRef, useState, useEffect } from "react";
import { useIMask } from "react-imask";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { format, parse, isValid } from "date-fns";

interface DateRangePickerProps {
  from?: string;  // YYYY-MM-DD
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
}

const DISPLAY_FORMAT = "dd/MM/yyyy";
const ISO_FORMAT = "yyyy-MM-dd";

function toDisplay(iso: string | undefined): string {
  if (!iso) return "";
  const d = parse(iso, ISO_FORMAT, new Date());
  return isValid(d) ? format(d, DISPLAY_FORMAT) : "";
}

function displayToIso(display: string): string | undefined {
  if (!display.trim()) return undefined;
  const d = parse(display.trim(), DISPLAY_FORMAT, new Date());
  return isValid(d) ? format(d, ISO_FORMAT) : undefined;
}

function isoToDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, ISO_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

const inputClass =
  "w-[7.5rem] rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm tabular-nums placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rango de fechas</legend>
      <div className="flex items-center gap-2">
        <DateInput
          value={from}
          onChangeIso={(v) => onChange(v, to)}
          label="Desde"
        />
        <span className="text-sm text-zinc-400">&ndash;</span>
        <DateInput
          value={to}
          onChangeIso={(v) => onChange(from, v)}
          label="Hasta"
        />
      </div>
    </fieldset>
  );
}

// ── Input individual con máscara y calendario ────────────────────────────

function DateInput({ value, onChangeIso, label }: {
  value?: string;
  onChangeIso: (iso: string | undefined) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { ref: maskRef, setValue } = useIMask(
    {
      mask: "DD/MM/AAAA",
      blocks: {
        DD: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2, placeholderChar: "d" },
        MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, placeholderChar: "m" },
        AAAA: { mask: IMask.MaskedRange, from: 1980, to: 2099, maxLength: 4, placeholderChar: "a" },
      },
      lazy: true,
      overwrite: "shift",
    },
    {
      onComplete: (val) => {
        const iso = displayToIso(val);
        if (iso) onChangeIso(iso);
      },
    },
  );

  // Sincroniza si el valor externo cambia (ej. selección desde calendario)
  useEffect(() => {
    setValue(toDisplay(value));
  }, [value, setValue]);

  // Cierra el calendario al hacer clic fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleDayClick(day: Date) {
    const iso = format(day, ISO_FORMAT);
    onChangeIso(iso);
    setOpen(false);
  }

  function handleBlur() {
    const current = (maskRef.current as HTMLInputElement | null)?.value ?? "";
    if (!current) {
      // El usuario borró el campo: limpia el filtro
      onChangeIso(undefined);
    } else if (!displayToIso(current)) {
      // Fecha incompleta o inválida: limpia input y filtro
      setValue("");
      onChangeIso(undefined);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={maskRef as React.RefObject<HTMLInputElement>}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        aria-label={label}
        className={inputClass}
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <DayPicker
            locale={es}
            mode="single"
            selected={isoToDate(value)}
            defaultMonth={isoToDate(value)}
            onSelect={(day) => day && handleDayClick(day)}
            classNames={{
              months: "flex flex-col",
              month_caption: "flex justify-center py-1 text-sm font-medium text-zinc-900 dark:text-zinc-100",
              nav: "flex items-center justify-between px-1",
              button_previous: "p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
              button_next: "p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
              weekdays: "flex",
              weekday: "w-8 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400",
              week: "flex",
              day: "w-8 h-8 text-center text-sm",
              day_button: "w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
              selected: "!bg-blue-600 !text-white rounded",
              today: "font-bold text-blue-600 dark:text-blue-400",
            }}
          />
        </div>
      )}
    </div>
  );
}

// IMask se importa como namespace para acceder a MaskedRange
import IMask from "imask";

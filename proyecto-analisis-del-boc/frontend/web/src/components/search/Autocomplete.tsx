"use client";

import { useEffect, useRef, useState } from "react";

interface AutocompleteProps {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onSelect: (value: string) => void;
}

export function Autocomplete({ value, options, placeholder, onChange, onCommit, onSelect }: AutocompleteProps) {
  const [open, setOpen] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  const showDropdown = open && filtered.length > 0;

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function select(option: string) {
    setOpen(false);
    onSelect(option);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) {
      if (e.key === "Enter" || e.key === "Escape") onCommit();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          setOpen(false);
          onSelect(filtered[activeIndex]);
        } else {
          onCommit();
        }
        break;
      case "Escape":
        e.preventDefault();
        onCommit();
        break;
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-36 rounded border-0 bg-transparent px-1 py-0 text-sm font-medium placeholder:text-current placeholder:opacity-40 focus:outline-none focus:ring-0"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {filtered.map((option, i) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(option);
                }}
                className={`w-full px-3 py-1.5 text-left text-sm ${
                  i === activeIndex
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

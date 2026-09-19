"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="surface text-muted-foreground relative mx-auto mt-8 flex w-full max-w-[680px] items-center gap-2.5 rounded-xl px-4 py-3.5">
      <Search className="size-4 shrink-0" aria-hidden />
      <label htmlFor="portal-search" className="sr-only">
        搜索网站、项目或工具
      </label>
      <input
        id="portal-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索网站、项目或工具…"
        autoComplete="off"
        enterKeyHint="search"
        className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[16px] outline-none sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="清空搜索"
          className="hover:text-foreground focus-visible:outline-ring inline-grid size-5 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

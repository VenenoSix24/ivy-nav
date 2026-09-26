"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "cn";
import { normalizeTagNames } from "@/lib/portal/schemas";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** 已有标签，输入时按它做匹配提示 */
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

/** 胶囊式标签输入：回车或逗号提交，退格删掉最后一个，粘贴按逗号拆开 */
export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = "输入后按回车",
  maxTags = 12,
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  /** 键盘选中的那条提示；-1 表示没选过，回车就提交输入框里的字 */
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const typed = draft.trim().toLowerCase();
    if (!suggestions || typed.length === 0) return [];

    const chosen = new Set(value.map((tag) => tag.toLowerCase()));
    const pool = suggestions.filter((name) => !chosen.has(name.toLowerCase()));
    const starts = pool.filter((name) => name.toLowerCase().startsWith(typed));
    const rest = pool.filter(
      (name) => !name.toLowerCase().startsWith(typed) && name.toLowerCase().includes(typed),
    );
    return [...starts, ...rest].slice(0, 6);
  }, [draft, suggestions, value]);

  function commit(raw: string) {
    const added = normalizeTagNames(raw.split(/[,，]/));
    if (added.length === 0) return;

    const next = [...value];
    for (const name of added) {
      if (next.length >= maxTags) break;
      if (next.some((existing) => existing.toLowerCase() === name.toLowerCase())) continue;
      next.push(name);
    }

    onChange(next);
    setDraft("");
    setActive(-1);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, position) => position !== index));
  }

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/30 flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border px-2 py-1.5 transition-colors focus-within:ring-3",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="bg-secondary text-foreground inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-[12px] leading-none"
        >
          {tag}
          <button
            type="button"
            aria-label={`移除标签 ${tag}`}
            onClick={(event) => {
              event.stopPropagation();
              removeAt(index);
            }}
            className="hover:bg-background/70 focus-visible:outline-ring grid size-4 place-items-center rounded-full transition-colors focus-visible:outline-2"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <input
        id={id}
        ref={inputRef}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          if (/[,，]$/.test(next)) {
            commit(next);
            return;
          }
          setDraft(next);
          setActive(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && matches.length > 0) {
            event.preventDefault();
            setActive((current) => (current + 1) % matches.length);
            return;
          }
          if (event.key === "ArrowUp" && matches.length > 0) {
            event.preventDefault();
            setActive((current) => (current <= 0 ? matches.length - 1 : current - 1));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            commit(active >= 0 ? (matches[active] ?? draft) : draft);
            return;
          }
          if (event.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        autoComplete="off"
        className="placeholder:text-muted-foreground min-w-[8ch] flex-1 bg-transparent py-1 text-[16px] outline-none sm:text-[14px]"
      />

      {matches.length > 0 ? (
        <div className="flex w-full flex-wrap items-center gap-1 pt-0.5">
          {matches.map((name, position) => (
            <button
              key={name}
              type="button"
              // 按下时不抢焦点，否则输入框先失焦、草稿先被当成新标签提交
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                commit(name);
              }}
              className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] leading-none transition-colors focus-visible:outline-2",
                position === active && "bg-secondary text-foreground",
              )}
            >
              <Plus className="size-3" />
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

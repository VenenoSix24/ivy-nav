"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { normalizeTagNames } from "@/lib/portal/schemas";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

/** 胶囊式标签输入：回车或逗号提交，退格删掉最后一个，粘贴按逗号拆开 */
export function TagInput({
  value,
  onChange,
  placeholder = "输入后按回车",
  maxTags = 12,
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
          if (/[,，]$/.test(next)) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
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
    </div>
  );
}

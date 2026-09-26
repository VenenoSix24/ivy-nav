"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Input } from "@/components/ui/input";
import type { TagSummary } from "@/lib/portal/types";

interface TagSettingsProps {
  /** 服务端渲染时取好的列表 */
  initialTags: TagSummary[];
}

/** 标签改名：改成一个已经存在的名字就是并过去 */
export function TagSettings({ initialTags }: TagSettingsProps) {
  const [tags, setTags] = useState<TagSummary[]>(initialTags);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function cancel() {
    setEditingId(null);
    setDraft("");
  }

  async function save(tag: TagSummary) {
    const name = draft.trim();
    if (busy) return;
    if (!name || name === tag.name) {
      cancel();
      return;
    }

    setBusy(true);
    const response = await fetch(`/api/tags/${tag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setBusy(false);

    if (!response?.ok) {
      toast.error(readError(payload) ?? "改名失败：请检查网络后重试。");
      return;
    }

    const next = readTags(payload);
    if (!next) {
      toast.error("服务器返回的标签列表不完整：请刷新页面后重试。");
      return;
    }

    setTags(next);
    cancel();
    toast.success(
      readMerged(payload)
        ? `已并到「${name}」，${tag.itemCount} 个条目跟着改了`
        : `已改名为「${name}」`,
    );
  }

  return (
    <SettingsSection
      title="标签"
      description="标签是共用的：在这里改名，用到它的条目会跟着改；改成一个已经存在的名字就是合并过去。没人用的标签在保存条目时自动清掉，所以这里不提供删除。"
    >
      {tags.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">
          还没有标签：在条目的标签框里输入就会创建。
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-3 py-2.5">
              {editingId === tag.id ? (
                <>
                  <Input
                    autoFocus
                    value={draft}
                    maxLength={30}
                    aria-label={`改名 ${tag.name}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void save(tag);
                      }
                      if (event.key === "Escape") cancel();
                    }}
                    className="h-9 flex-1 rounded-xl text-[16px] sm:text-[13px]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    title="保存"
                    onClick={() => void save(tag)}
                    className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center rounded-md px-1.5 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    title="取消"
                    onClick={cancel}
                    className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center rounded-md px-1.5 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{tag.name}</p>
                    <p className="text-muted-foreground text-[12px]">{tag.itemCount} 个条目</p>
                  </div>
                  <button
                    type="button"
                    title="改名"
                    onClick={() => {
                      setEditingId(tag.id);
                      setDraft(tag.name);
                    }}
                    className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center rounded-md px-1.5 text-[12px] transition-colors focus-visible:outline-2"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}

function readTags(payload: unknown): TagSummary[] | null {
  const list = (payload as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(list)) return null;

  return list.flatMap((entry) => {
    const row = entry as Partial<TagSummary>;
    if (typeof row.id !== "number" || typeof row.name !== "string") return [];
    return [
      {
        id: row.id,
        name: row.name,
        itemCount: typeof row.itemCount === "number" ? row.itemCount : 0,
      },
    ];
  });
}

function readMerged(payload: unknown): boolean {
  return (payload as { merged?: unknown } | null)?.merged === true;
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

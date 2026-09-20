"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  INBOX_LABEL,
  mergePreview,
  type BookmarkPreview,
  type BookmarkPreviewPayload,
  type PlannedGroup,
} from "@/lib/bookmarks/plan";

const PILL = "rounded-full px-2 py-[3px] text-[11px] leading-none";
const PILL_NEW = `${PILL} bg-accent text-accent-foreground`;
const PILL_EXISTING = `${PILL} bg-secondary text-muted-foreground tabular-nums`;

const CATEGORY_ROWS = 24;
const TAG_CHIPS = 24;

/**
 * 浏览器书签导入：选文件 → 挑目录 → 看预览 → 确认。
 *
 * 预览与实际写入是同一段服务端逻辑（两边都按「文件 + 挑中的目录」重算一遍计划），所以这里
 * 只负责把计划讲清楚，以及把勾选范围里的数字加起来（`mergePreview`），不自己推断会发生什么。
 */
export function BookmarkImport() {
  const [pending, setPending] = useState<{ html: string; payload: BookmarkPreviewPayload } | null>(
    null,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function openPreview(text: string) {
    setReading(true);
    const response = await fetch("/api/bookmarks/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: text }),
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setReading(false);

    const preview = (payload as { preview?: unknown } | null)?.preview;
    if (!response?.ok || !preview) {
      toast.error(readError(payload) ?? "读不出这份书签文件：请确认是浏览器的导出文件。");
      return;
    }

    const data = preview as BookmarkPreviewPayload;
    setOverwrite(false);
    // 默认全选：多数人就是整份导进来，要挑再把某几行去掉
    setSelected(data.groups.map((group) => group.key));
    setPending({ html: text, payload: data });
  }

  async function runImport() {
    if (!pending) return;
    setImporting(true);

    const response = await fetch("/api/bookmarks/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: pending.html,
        duplicates: overwrite ? "overwrite" : "skip",
        groups: selected,
      }),
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setImporting(false);

    if (!response?.ok) {
      toast.error(readError(payload) ?? "导入失败：请重试。");
      return;
    }

    const summary = (payload as { imported?: Partial<Record<string, number>> } | null)?.imported;
    const created = summary?.created ?? 0;
    const updated = summary?.updated ?? 0;
    const skipped = summary?.skipped ?? 0;
    const categories = summary?.categories ?? 0;

    setPending(null);
    toast.success(
      `导入完成：新增 ${created} 条${categories ? `、${categories} 个新分类` : ""}${
        updated ? `、更新 ${updated} 条` : ""
      }${skipped ? `、跳过 ${skipped} 条` : ""}`,
    );
    window.location.reload();
  }

  return (
    <>
      <SettingsSection
        title="浏览器书签"
        description="Chrome、Edge、Firefox、Safari 导出的书签文件都能读。一级目录当分类，二级及更深的目录当标签，顶层的浏览器自带目录会被忽略；导入前可以只挑其中几个目录。"
      >
        <input
          ref={fileInput}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (fileInput.current) fileInput.current.value = "";
            if (!file) return;
            void openPreview(await file.text());
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={reading}
            onClick={() => fileInput.current?.click()}
            className="h-9 rounded-xl px-4 text-[13px]"
          >
            {reading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileUp className="size-3.5" />
            )}
            {reading ? "读取中…" : "选择书签文件"}
          </Button>
          <span className="text-muted-foreground text-[12px]">先看一遍预览，确认后才写入</span>
        </div>

        <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
          导入只新增与更新，不会删除现有内容；新分类默认公开显示在首页。同一个网址出现在两个分类里
          会在两处各建一条（合并成一条会让另一个分类少一条），预览里会提示。图标不在这里抓取，
          打开首页时按需缓存，所以导入本身很快、也不碰外网。
        </p>
      </SettingsSection>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {pending ? (
            <PreviewBody
              payload={pending.payload}
              selected={selected}
              onSelected={setSelected}
              overwrite={overwrite}
              onOverwrite={setOverwrite}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={importing}>
              取消
            </Button>
            <Button onClick={() => void runImport()} disabled={importing || !pending}>
              {importing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {importing
                ? "导入中…"
                : `确认导入 ${pending ? countToWrite(pending, selected, overwrite) : 0} 条`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreviewBodyProps {
  payload: BookmarkPreviewPayload;
  selected: string[];
  onSelected: (keys: string[]) => void;
  overwrite: boolean;
  onOverwrite: (value: boolean) => void;
}

function PreviewBody({ payload, selected, onSelected, overwrite, onOverwrite }: PreviewBodyProps) {
  const { merged: all, groups, shared, ignoredRoots } = payload;
  const keys = useMemo(() => groups.map((group) => group.key), [groups]);
  const chosen = useMemo(
    () => groups.filter((group) => selected.includes(group.key)),
    [groups, selected],
  );
  const merged = useMemo(
    () => (chosen.length === groups.length ? all : mergePreview(chosen.map((g) => g.preview))),
    [chosen, groups.length, all],
  );

  const create = countToCreate(merged, overwrite);
  const update = overwrite ? merged.existingDuplicates : 0;
  const newTags = merged.tags.filter((tag) => !tag.existing);
  const oldTags = merged.tags.filter((tag) => tag.existing);

  return (
    <>
      <DialogHeader>
        <DialogTitle>导入 {create + update} 条书签？</DialogTitle>
        <DialogDescription>
          文件里共 {payload.total} 条，挑中的目录里有 {merged.total} 条：新增 {create} 条
          {update > 0 ? `、更新 ${update} 条` : ""}
          {merged.repeatsInFile > 0 ? `，同一分类内重复跳过 ${merged.repeatsInFile} 条` : ""}
          {merged.invalidTotal > 0 ? `，${merged.invalidTotal} 条读不了` : ""}。
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto text-[13px]">
        {groups.length > 1 ? (
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="font-medium">导入哪些目录</p>
              <div className="flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => onSelected(keys)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  全选
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => onSelected([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  全不选
                </button>
              </div>
            </div>
            <ul className="divide-border divide-y">
              {groups.map((group) => (
                <GroupRow
                  key={group.key}
                  group={group}
                  checked={selected.includes(group.key)}
                  onToggle={() =>
                    onSelected(
                      selected.includes(group.key)
                        ? selected.filter((key) => key !== group.key)
                        : [...selected, group.key],
                    )
                  }
                />
              ))}
            </ul>
          </section>
        ) : null}

        {merged.importable === 0 ? (
          <p className="text-muted-foreground text-[12px]">
            挑中的目录里没有可导入的条目：换几个目录，或者换一份文件。
          </p>
        ) : null}

        {merged.existingDuplicates > 0 ? (
          <label className="border-border flex items-start justify-between gap-4 rounded-xl border p-3">
            <span>
              <span className="block text-[13px] font-medium">覆盖已有条目</span>
              <span className="text-muted-foreground mt-1 block text-[12px] leading-relaxed">
                有 {merged.existingDuplicates} 条书签的网址已经在同一个分类里了。关着就原样跳过；
                打开会用书签里的标题与描述更新它们，标签是并进去而不是换掉。
              </span>
            </span>
            <Switch checked={overwrite} onCheckedChange={onOverwrite} className="mt-0.5" />
          </label>
        ) : null}

        {shared.urls > 0 ? (
          <section className="border-border rounded-xl border p-3">
            <p className="text-[13px] font-medium">有 {shared.urls} 个网址出现在多个分类里</p>
            <p className="text-muted-foreground mt-1 text-[12px] leading-relaxed">
              会按分类各建一条（比「一个网址一条」多 {shared.extra}{" "}
              条），所以在各自的分类里都看得到。
            </p>
            {shared.sample.length > 0 ? (
              <ul className="text-muted-foreground mt-1.5 space-y-0.5 text-[12px]">
                {shared.sample.map((row) => (
                  <li key={row.url} className="truncate">
                    {row.title} —— {row.categories.join(" / ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section>
          <p className="mb-2 font-medium">分类</p>
          {merged.categories.length === 0 ? (
            <p className="text-muted-foreground text-[12px]">都在文件顶层，会落进「未分类」。</p>
          ) : (
            <ul className="divide-border divide-y">
              {merged.categories.slice(0, CATEGORY_ROWS).map((category) => (
                <li key={category.name} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <span className={category.existing ? PILL_EXISTING : PILL_NEW}>
                    {category.existing ? "已有" : "新建"}
                  </span>
                  <span className="text-muted-foreground w-8 text-right text-[12px] tabular-nums">
                    {category.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {merged.categories.length > CATEGORY_ROWS ? (
            <p className="text-muted-foreground mt-1.5 text-[12px]">
              另有 {merged.categories.length - CATEGORY_ROWS} 个分类
            </p>
          ) : null}
        </section>

        <section>
          <p className="mb-2 font-medium">
            标签
            <span className="text-muted-foreground ml-2 text-[12px] font-normal">
              新增 {newTags.length} · 已有 {oldTags.length}
            </span>
          </p>
          {merged.tags.length === 0 ? (
            <p className="text-muted-foreground text-[12px]">
              没有二级目录，所以这次不会产生标签。
            </p>
          ) : (
            <p className="flex flex-wrap gap-1.5">
              {newTags.slice(0, TAG_CHIPS).map((tag) => (
                <span key={tag.name} className={PILL_NEW}>
                  {tag.name}
                </span>
              ))}
              {oldTags.slice(0, Math.max(0, TAG_CHIPS - newTags.length)).map((tag) => (
                <span key={tag.name} className={PILL_EXISTING}>
                  {tag.name}
                </span>
              ))}
              {merged.tagTotal > TAG_CHIPS ? (
                <span className={PILL_EXISTING}>+{merged.tagTotal - TAG_CHIPS}</span>
              ) : null}
            </p>
          )}
        </section>

        <Notes preview={merged} ignoredRoots={ignoredRoots} />

        {merged.invalidTotal > 0 ? (
          <section>
            <p className="mb-2 font-medium">读不了的行（{merged.invalidTotal}）</p>
            <ul className="text-muted-foreground space-y-1 text-[12px]">
              {merged.invalid.slice(0, 5).map((row, index) => (
                <li key={`${row.url}-${index}`} className="truncate">
                  {row.title || row.url || "（空行）"} —— {row.reason}
                </li>
              ))}
            </ul>
            {merged.invalidTotal > 5 ? (
              <p className="text-muted-foreground mt-1 text-[12px]">
                另有 {merged.invalidTotal - 5} 行
              </p>
            ) : null}
          </section>
        ) : null}

        {merged.sample.length > 0 ? (
          <section>
            <p className="mb-2 font-medium">前几条会是这样</p>
            <ul className="text-muted-foreground space-y-1 text-[12px]">
              {merged.sample.slice(0, 5).map((row) => (
                <li key={row.url} className="truncate">
                  {row.title}
                  <span className="mx-1.5">·</span>
                  {row.categoryName ?? INBOX_LABEL}
                  {row.tags.length > 0 ? ` / ${row.tags.join(" / ")}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

interface GroupRowProps {
  group: PlannedGroup;
  checked: boolean;
  onToggle: () => void;
}

function GroupRow({ group, checked, onToggle }: GroupRowProps) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-2.5 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="size-3.5 shrink-0"
          // 原生勾选框的默认色各浏览器不一，跟着主题主色走
          style={{ accentColor: "var(--primary)" }}
        />
        <span className="min-w-0 flex-1 truncate">
          {group.name}
          {group.categoryName === null ? (
            <span className="text-muted-foreground ml-1.5 text-[12px]">（顶层散着的书签）</span>
          ) : null}
        </span>
        <span className="text-muted-foreground text-[12px] tabular-nums">{group.count}</span>
      </label>
    </li>
  );
}

function Notes({ preview, ignoredRoots }: { preview: BookmarkPreview; ignoredRoots: string[] }) {
  const notes: string[] = [];

  if (ignoredRoots.length > 0) {
    notes.push(`已忽略浏览器自带的顶层目录：${ignoredRoots.join("、")}`);
  }
  if (preview.derivedTitles > 0) {
    notes.push(`${preview.derivedTitles} 条没有标题，用域名当标题`);
  }
  if (preview.truncatedTitles + preview.truncatedDescriptions + preview.truncatedTags > 0) {
    notes.push(
      `${preview.truncatedTitles} 个标题、${preview.truncatedDescriptions} 条描述、${preview.truncatedTags} 组标签超长，已按上限截断`,
    );
  }
  if (notes.length === 0) return null;

  return (
    <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-[12px] leading-relaxed">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

function countToCreate(preview: BookmarkPreview, overwrite: boolean): number {
  const duplicates = overwrite ? 0 : preview.existingDuplicates;
  return Math.max(0, preview.importable - duplicates);
}

/** 底部按钮上的数字要跟着勾选走，所以这里按同一套规则现算一遍 */
function countToWrite(
  pending: { payload: BookmarkPreviewPayload },
  selected: string[],
  overwrite: boolean,
): number {
  const chosen = pending.payload.groups.filter((group) => selected.includes(group.key));
  const merged =
    chosen.length === pending.payload.groups.length
      ? pending.payload.merged
      : mergePreview(chosen.map((group) => group.preview));
  return countToCreate(merged, overwrite) + (overwrite ? merged.existingDuplicates : 0);
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

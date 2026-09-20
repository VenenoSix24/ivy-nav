"use client";

import { useRef, useState } from "react";
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
import type { BookmarkPreview } from "@/lib/bookmarks/plan";

const PILL = "rounded-full px-2 py-[3px] text-[11px] leading-none";
const PILL_NEW = `${PILL} bg-accent text-accent-foreground`;
const PILL_EXISTING = `${PILL} bg-secondary text-muted-foreground tabular-nums`;

const CATEGORY_ROWS = 24;
const TAG_CHIPS = 24;

/**
 * 浏览器书签导入：选文件 → 预览一遍 → 确认。
 *
 * 预览与实际写入是同一段服务端逻辑（`/api/bookmarks/preview` 与 `/api/bookmarks/import`
 * 各自算一次），所以这里只负责把计划讲清楚，不自己推断会发生什么。
 */
export function BookmarkImport() {
  const [pending, setPending] = useState<{ html: string; preview: BookmarkPreview } | null>(null);
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

    if (!response?.ok) {
      toast.error(readError(payload) ?? "读不出这份书签文件：请确认是浏览器的导出文件。");
      return;
    }

    const preview = (payload as { preview?: unknown } | null)?.preview;
    if (!preview) {
      toast.error("读不出这份书签文件：请确认是浏览器的导出文件。");
      return;
    }

    setOverwrite(false);
    setPending({ html: text, preview: preview as BookmarkPreview });
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

    setPending(null);
    toast.success(
      `导入完成：新增 ${created} 条${updated ? `、更新 ${updated} 条` : ""}${
        skipped ? `、跳过 ${skipped} 条` : ""
      }`,
    );
    window.location.reload();
  }

  return (
    <>
      <SettingsSection
        title="浏览器书签"
        description="Chrome、Edge、Firefox、Safari 导出的书签文件都能读。一级目录当分类，二级及更深的目录当标签，顶层的浏览器自带目录会被忽略。"
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
          导入只新增与更新，不会删除现有内容；新分类默认公开显示在首页。图标不在这里抓取，
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
              preview={pending.preview}
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
                : `确认导入 ${pending ? countToWrite(pending.preview, overwrite) : 0} 条`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreviewBodyProps {
  preview: BookmarkPreview;
  overwrite: boolean;
  onOverwrite: (value: boolean) => void;
}

function PreviewBody({ preview, overwrite, onOverwrite }: PreviewBodyProps) {
  const create = countToCreate(preview);
  const update = overwrite ? preview.existingDuplicates : 0;
  const newTags = preview.tags.filter((tag) => !tag.existing);
  const oldTags = preview.tags.filter((tag) => tag.existing);

  return (
    <>
      <DialogHeader>
        <DialogTitle>导入 {countToWrite(preview, overwrite)} 条书签？</DialogTitle>
        <DialogDescription>
          文件里共 {preview.total} 条：新增 {create} 条{update > 0 ? `、更新 ${update} 条` : ""}
          {preview.duplicatesInFile > 0 ? `，跳过文件内重复 ${preview.duplicatesInFile} 条` : ""}
          {preview.invalidTotal > 0 ? `，${preview.invalidTotal} 条读不了` : ""}。
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto text-[13px]">
        {preview.existingDuplicates > 0 ? (
          <label className="border-border flex items-start justify-between gap-4 rounded-xl border p-3">
            <span>
              <span className="block text-[13px] font-medium">覆盖已有条目</span>
              <span className="text-muted-foreground mt-1 block text-[12px] leading-relaxed">
                库里有 {preview.existingDuplicates} 条同网址的条目。关着就原样跳过；打开会用书签里的
                标题、描述与分类更新它们，标签是并进去而不是换掉。
              </span>
            </span>
            <Switch checked={overwrite} onCheckedChange={onOverwrite} className="mt-0.5" />
          </label>
        ) : null}

        <section>
          <p className="mb-2 font-medium">分类</p>
          {preview.categories.length === 0 ? (
            <p className="text-muted-foreground text-[12px]">都在文件顶层，会落进「未分类」。</p>
          ) : (
            <ul className="divide-border divide-y">
              {preview.categories.slice(0, CATEGORY_ROWS).map((category) => (
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
          {preview.categories.length > CATEGORY_ROWS ? (
            <p className="text-muted-foreground mt-1.5 text-[12px]">
              另有 {preview.categories.length - CATEGORY_ROWS} 个分类
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
          {preview.tags.length === 0 ? (
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
              {preview.tagTotal > TAG_CHIPS ? (
                <span className={PILL_EXISTING}>+{preview.tagTotal - TAG_CHIPS}</span>
              ) : null}
            </p>
          )}
        </section>

        <Notes preview={preview} />

        {preview.invalidTotal > 0 ? (
          <section>
            <p className="mb-2 font-medium">读不了的行（{preview.invalidTotal}）</p>
            <ul className="text-muted-foreground space-y-1 text-[12px]">
              {preview.invalid.slice(0, 5).map((row, index) => (
                <li key={`${row.url}-${index}`} className="truncate">
                  {row.title || row.url || "（空行）"} —— {row.reason}
                </li>
              ))}
            </ul>
            {preview.invalidTotal > 5 ? (
              <p className="text-muted-foreground mt-1 text-[12px]">
                另有 {preview.invalidTotal - 5} 行
              </p>
            ) : null}
          </section>
        ) : null}

        {preview.sample.length > 0 ? (
          <section>
            <p className="mb-2 font-medium">前几条会是这样</p>
            <ul className="text-muted-foreground space-y-1 text-[12px]">
              {preview.sample.slice(0, 5).map((row) => (
                <li key={row.url} className="truncate">
                  {row.title}
                  <span className="mx-1.5">·</span>
                  {row.categoryName ?? "未分类"}
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

function Notes({ preview }: { preview: BookmarkPreview }) {
  const notes: string[] = [];

  if (preview.ignoredRoots.length > 0) {
    notes.push(`已忽略浏览器自带的顶层目录：${preview.ignoredRoots.join("、")}`);
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

function countToCreate(preview: BookmarkPreview): number {
  return Math.max(0, preview.importable - preview.existingDuplicates);
}

function countToWrite(preview: BookmarkPreview, overwrite: boolean): number {
  return countToCreate(preview) + (overwrite ? preview.existingDuplicates : 0);
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

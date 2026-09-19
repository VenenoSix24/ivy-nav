"use client";

import { useEffect, useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  HardDriveDownload,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

interface Snapshot {
  name: string;
  size: number;
  createdAt: string;
}

export function DataSettings() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Snapshot | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch("/api/backup/list").catch(() => null);
      const payload: unknown = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      setSnapshots(readSnapshots(payload));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createBackup() {
    setBusy(true);
    const response = await fetch("/api/backup/create", { method: "POST" }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setBusy(false);

    if (!response?.ok) {
      toast.error(readError(payload) ?? "备份失败：请检查备份目录是否可写。");
      return;
    }

    setSnapshots(readSnapshots(payload));
    toast.success("已创建数据库备份");
  }

  async function importDocument(text: string) {
    setImporting(true);
    const response = await fetch("/api/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setImporting(false);

    if (!response?.ok) {
      toast.error(readError(payload) ?? "导入失败：请确认文件来自本项目的导出。");
      return;
    }

    const summary = (payload as { imported?: { categories: number; items: number } }).imported;
    toast.success(`导入完成：${summary?.categories ?? 0} 个分类、${summary?.items ?? 0} 个条目`);
    window.location.reload();
  }

  async function restore(snapshot: Snapshot) {
    setBusy(true);
    const response = await fetch("/api/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: snapshot.name, confirm: true }),
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setBusy(false);

    if (!response?.ok) {
      toast.error(readError(payload) ?? "恢复失败：请确认备份文件仍然存在。");
      return;
    }

    const restored = (payload as { restored?: { categories: number; items: number } }).restored;
    toast.success(`已恢复：${restored?.categories ?? 0} 个分类、${restored?.items ?? 0} 个条目`);
    window.location.reload();
  }

  return (
    <>
      <SettingsSection
        title="数据"
        description="导出与导入是内容层面的 JSON；数据库备份是整库快照，两者都可以随时下载留档。"
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium">导出与导入</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/backup/export"
                download
                className={cn(buttonVariants(), "h-9 rounded-xl px-4 text-[13px]")}
              >
                <Download className="size-3.5" />
                导出 JSON
              </a>

              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (fileInput.current) fileInput.current.value = "";
                  if (!file) return;
                  setPendingImport(await file.text());
                }}
              />
              <Button
                variant="outline"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
                className="h-9 rounded-xl px-4 text-[13px]"
              >
                {importing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {importing ? "导入中…" : "导入 JSON"}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-[12px] leading-relaxed">
              导入会用文件里的内容替换现有分类、条目与标签；管理员账号与登录状态不受影响。
            </p>
          </div>

          <div className="border-border border-t pt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium">数据库备份</p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void createBackup()}
                className="h-8 rounded-full px-3 text-[12px]"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <DatabaseBackup className="size-3.5" />
                )}
                立即备份
              </Button>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-[12px]">读取中…</p>
            ) : snapshots.length === 0 ? (
              <p className="text-muted-foreground text-[12px]">
                还没有备份：点「立即备份」会生成一份放到备份目录。
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {snapshots.map((snapshot) => (
                  <li key={snapshot.name} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[12px]">{snapshot.name}</p>
                      <p className="text-muted-foreground text-[12px] tabular-nums">
                        {formatSize(snapshot.size)}｜{formatDateTime(snapshot.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={`/api/backup/download?name=${encodeURIComponent(snapshot.name)}`}
                        download
                        aria-label={`下载 ${snapshot.name}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          "rounded-full",
                        )}
                      >
                        <HardDriveDownload className="size-3.5" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`从 ${snapshot.name} 恢复`}
                        disabled={busy}
                        onClick={() => setPendingRestore(snapshot)}
                        className="rounded-full"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed">
              备份是数据库文件的完整副本，里面也包含管理员密码的哈希值，请存放在安全的位置。
            </p>
          </div>
        </div>
      </SettingsSection>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>用这个文件替换现有内容？</AlertDialogTitle>
            <AlertDialogDescription>
              现有的分类、条目与标签会被文件里的内容整体替换，无法撤销。 建议先导出一份当前的 JSON
              或做一次数据库备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const text = pendingImport;
                setPendingImport(null);
                if (text) void importDocument(text);
              }}
            >
              确认导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRestore !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>从 {pendingRestore?.name} 恢复？</AlertDialogTitle>
            <AlertDialogDescription>
              当前内容会被这份备份整体覆盖，无法撤销。管理员账号与登录状态不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const snapshot = pendingRestore;
                setPendingRestore(null);
                if (snapshot) void restore(snapshot);
              }}
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function readSnapshots(payload: unknown): Snapshot[] {
  if (!payload || typeof payload !== "object") return [];
  const { snapshots } = payload as { snapshots?: unknown };
  if (!Array.isArray(snapshots)) return [];
  return snapshots.filter(
    (entry): entry is Snapshot =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as Snapshot).name === "string" &&
      typeof (entry as Snapshot).size === "number" &&
      typeof (entry as Snapshot).createdAt === "string",
  );
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

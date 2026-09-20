"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";

interface IconSetRow {
  id: number;
  name: string;
  url: string;
  count: number;
  mirrored: boolean;
  createdAt: string;
}

/** 自建图标集：一份 JSON 一份集合，只存「名字 → 图片地址」的清单 */
interface IconSetSettingsProps {
  /** 服务端渲染时取好的列表 */
  initialSets: IconSetRow[];
}

export function IconSetSettings({ initialSets }: IconSetSettingsProps) {
  const [sets, setSets] = useState<IconSetRow[]>(initialSets);
  const [url, setUrl] = useState("");
  const [mirror, setMirror] = useState(true);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/icon-sets").catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    if (response?.ok) setSets(readSets(payload));
  }

  async function submit(target: string, options: { refresh?: IconSetRow } = {}) {
    const trimmed = (options.refresh?.url ?? target).trim();
    if (!trimmed) return;

    if (options.refresh === undefined) setBusy(true);
    else setWorking(options.refresh.id);

    const mirrorFlag = options.refresh
      ? options.refresh.mirrored
      : mirror || trimmed.includes("raw.githubusercontent.com");

    try {
      const response = await fetch("/api/icon-sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed, mirror: mirrorFlag }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(readError(payload) ?? `加入失败（HTTP ${response.status}）：请重试。`);
        return;
      }

      const name = (payload as { name?: unknown } | null)?.name;
      const count = (payload as { count?: unknown } | null)?.count;
      toast.success(
        `已加入「${typeof name === "string" ? name : "图标集"}」，${
          typeof count === "number" ? count : 0
        } 个图标`,
      );
      setUrl("");
      await load();
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    } finally {
      setBusy(false);
      setWorking(null);
    }
  }

  async function remove(row: IconSetRow) {
    if (!window.confirm(`删除图标集「${row.name}」？已经用上的图标不会消失。`)) return;

    setWorking(row.id);
    try {
      const response = await fetch(`/api/icon-sets?id=${row.id}`, { method: "DELETE" });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(readError(payload) ?? "删除失败：请重试。");
        return;
      }
      toast.success("图标集已删除");
      await load();
    } finally {
      setWorking(null);
    }
  }

  return (
    <SettingsSection
      title="图标库"
      description="这里可以添加自建的 JSON 图标集。只存清单，并不会全量下载。"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…/icons-all.json"
            autoComplete="off"
            spellCheck={false}
            className="border-input h-9 min-w-0 flex-1 rounded-xl border px-3 text-[13px] outline-none"
          />
          <label className="text-muted-foreground flex items-center gap-1.5 text-[13px]">
            <input
              type="checkbox"
              checked={mirror}
              onChange={(event) => setMirror(event.target.checked)}
              className="accent-primary size-3.5"
            />
            镜像加速
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !url.trim()}
            onClick={() => void submit(url)}
            className="h-9 rounded-xl px-4 text-[13px]"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {busy ? "抓取中…" : "加入"}
          </Button>
        </div>

        <p className="text-muted-foreground text-[12px] leading-relaxed">
          地址要指向原始 JSON（形如 {`{name, description, icons: [{name, url}]}`}，也接受数组或{" "}
          {`{名字: 地址}`}）。
          <br />
          图标地址在 raw.githubusercontent 上的话，勾上「镜像加速」会改走 jsDelivr。
        </p>

        {sets.length === 0 ? (
          <p className="text-muted-foreground text-[13px]">还没有自建图标集。</p>
        ) : (
          <ul className="divide-border divide-y">
            {sets.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{row.name}</p>
                  <p className="text-muted-foreground truncate text-[12px]">
                    {row.count} 个图标{row.mirrored ? "｜走 jsDelivr 镜像" : ""}｜
                    {formatDate(row.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={working !== null}
                  title="按同一个地址重新抓一份"
                  onClick={() => void submit(row.url, { refresh: row })}
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-50"
                >
                  {working === row.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={working !== null}
                  onClick={() => void remove(row)}
                  className="text-muted-foreground hover:text-destructive focus-visible:outline-ring inline-flex items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function readSets(payload: unknown): IconSetRow[] {
  const list = (payload as { sets?: unknown } | null)?.sets;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    const row = entry as Partial<IconSetRow>;
    if (typeof row.id !== "number" || typeof row.name !== "string") return [];
    return [
      {
        id: row.id,
        name: row.name,
        url: typeof row.url === "string" ? row.url : "",
        count: typeof row.count === "number" ? row.count : 0,
        mirrored: row.mirrored === true,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
      },
    ];
  });
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

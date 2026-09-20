"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, ImageDown, Loader2, Search, Upload } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { IconGlyph, previewFaviconSrc, type IconSpec } from "@/components/icons/icon-glyph";
import { lucideNames, lucideRegistry } from "@/components/icons/lucide-registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emojiCatalog, searchEmoji } from "@/lib/icons/emoji";

interface IconPickerProps {
  spec: IconSpec;
  onChange: (spec: IconSpec) => void;
  /** 用于预览还没保存的网址 */
  url: string;
  title: string;
  /** 打开时这个条目的图标已经取过了（编辑已有条目）：预览直接显示，不用再点一次 */
  initialFetched?: boolean;
}

type FetchState = "idle" | "loading" | "ok" | "failed";

const MAX_UPLOAD_BYTES = 512 * 1024;

export function IconPicker({
  spec,
  onChange,
  url,
  title,
  initialFetched = false,
}: IconPickerProps) {
  const [emojiQuery, setEmojiQuery] = useState("");
  const [lucideQuery, setLucideQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  /**
   * 网站图标要「点一下才去抓」：以前那一行「使用网站图标」看着像个按钮，
   * 点下去的其实只是选中态，谁点了都会以为坏了。现在就一个「获取图标」按钮，
   * 抓到了显示图标，抓不到明说抓不到。
   */
  const [fetchState, setFetchState] = useState<FetchState>(initialFetched ? "ok" : "idle");
  const fileInput = useRef<HTMLInputElement>(null);

  // 网址一换，之前那次获取就不作数了，免得拿着旧站点的结果当新站点的
  const lastUrl = useRef(url.trim());
  useEffect(() => {
    const next = url.trim();
    if (next === lastUrl.current) return;
    lastUrl.current = next;
    setFetchState("idle");
  }, [url]);

  const emojiResults = searchEmoji(emojiQuery);
  const lucideResults = filterLucide(lucideQuery);

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("文件超过 512 KB：请压缩后重试。");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/icons/upload", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(readError(payload) ?? `上传失败（HTTP ${response.status}）：请重试。`);
        return;
      }

      const filename = (payload as { filename?: unknown } | null)?.filename;
      if (typeof filename !== "string") {
        toast.error("上传结果不完整：请重试。");
        return;
      }

      onChange({ type: "upload", value: filename });
      toast.success("图标已上传");
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const faviconHint =
    fetchState === "failed"
      ? "没抓到这个网站的图标：可以改用 Emoji、Lucide 或自己上传，也可以就这样保存（会显示标题首字母）。"
      : fetchState === "ok"
        ? "已取到网站图标。"
        : url.trim()
          ? "还没获取：点左边的按钮去抓一次。"
          : "先在上面填上网址，再来获取图标。";

  async function fetchFavicon() {
    const target = url.trim();
    if (!target) return;

    onChange({ type: "favicon", value: null });
    setFetchState("loading");
    setFetchState((await probeImage(previewFaviconSrc(target))) ? "ok" : "failed");
  }

  return (
    <div className="border-border rounded-xl border p-3">
      <div className="mb-3 flex items-center gap-3">
        <span
          aria-hidden
          className="border-hairline bg-glass-strong inline-grid size-12 place-items-center rounded-lg border leading-none [--icon-glyph:1.75rem]"
        >
          <IconGlyph
            spec={spec}
            title={title || "?"}
            faviconSrc={fetchState === "ok" && url.trim() ? previewFaviconSrc(url) : ""}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">图标</p>
          <p className="text-muted-foreground truncate text-[12px]">{describe(spec)}</p>
        </div>
        {spec.type !== "none" ? (
          <button
            type="button"
            onClick={() => onChange({ type: "none", value: null })}
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex items-center gap-1 rounded-md text-[12px] transition-colors focus-visible:outline-2"
          >
            <Ban className="size-3.5" />
            不用图标
          </button>
        ) : null}
      </div>

      <Tabs defaultValue="favicon">
        <TabsList className="w-full">
          <TabsTrigger value="favicon">自动</TabsTrigger>
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="lucide">Lucide</TabsTrigger>
          <TabsTrigger value="upload">上传</TabsTrigger>
        </TabsList>

        <TabsContent value="favicon" className="pt-3">
          <p className="text-muted-foreground mb-3 text-[12px] leading-relaxed">
            点「获取图标」去这个网站抓一张，抓到的会缓存在服务器上，以后打开不用重新抓。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!url.trim() || fetchState === "loading"}
              onClick={() => void fetchFavicon()}
              className={cn(
                "border-hairline bg-glass-strong focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors focus-visible:outline-2",
                "hover:bg-glass",
                fetchState === "ok" ? "text-primary" : "text-foreground",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {fetchState === "loading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImageDown className="size-3.5" />
              )}
              {fetchState === "loading" ? "获取中…" : fetchState === "ok" ? "重新获取" : "获取图标"}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 text-[12px] leading-relaxed",
                fetchState === "failed" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {faviconHint}
            </span>
          </div>
        </TabsContent>

        <TabsContent value="emoji" className="pt-3">
          <SearchField
            value={emojiQuery}
            onChange={setEmojiQuery}
            placeholder={`搜索 ${emojiCatalog.length} 个常用 emoji，支持中文`}
          />
          <div className="no-scrollbar mt-3 grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
            {emojiResults.map((entry) => (
              <button
                key={entry.char}
                type="button"
                title={`${entry.group}｜${entry.keywords.slice(0, 3).join(" ")}`}
                onClick={() => onChange({ type: "emoji", value: entry.char })}
                className={cn(
                  "focus-visible:outline-ring grid size-9 place-items-center rounded-lg text-[19px] transition-colors focus-visible:outline-2",
                  spec.type === "emoji" && spec.value === entry.char
                    ? "bg-accent"
                    : "hover:bg-secondary",
                )}
              >
                {entry.char}
              </button>
            ))}
          </div>
          {emojiResults.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-[12px]">没有匹配的 emoji：换个词试试。</p>
          ) : null}
        </TabsContent>

        <TabsContent value="lucide" className="pt-3">
          <SearchField
            value={lucideQuery}
            onChange={setLucideQuery}
            placeholder={`搜索 ${lucideNames.length} 个线性图标（英文名）`}
          />
          <div className="no-scrollbar mt-3 grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
            {lucideResults.map((name) => {
              const Icon = lucideRegistry[name as keyof typeof lucideRegistry];
              const active = spec.type === "lucide" && spec.value === name;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => onChange({ type: "lucide", value: name })}
                  className={cn(
                    "focus-visible:outline-ring grid size-9 place-items-center rounded-lg transition-colors focus-visible:outline-2",
                    active ? "bg-accent" : "hover:bg-secondary",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
          {lucideResults.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-[12px]">没有匹配的图标：换个词试试。</p>
          ) : null}
        </TabsContent>

        <TabsContent value="upload" className="pt-3">
          <p className="text-muted-foreground mb-3 text-[12px] leading-relaxed">
            支持 PNG、JPG、WEBP、SVG，单张不超过 512 KB。SVG 会被清洗后再保存， 并且只作为图片渲染。
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="bg-secondary hover:bg-accent focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploading ? "上传中…" : "选择文件"}
          </button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="border-input flex items-center gap-2 rounded-lg border px-2.5">
      <Search className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
      />
    </div>
  );
}

function filterLucide(query: string): string[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return lucideNames;
  return lucideNames.filter((name) => terms.every((term) => name.includes(term)));
}

function describe(spec: IconSpec): string {
  switch (spec.type) {
    case "favicon":
      return "自动读取网站图标";
    case "emoji":
      return `Emoji ${spec.value ?? ""}`;
    case "lucide":
      return `Lucide：${spec.value ?? ""}`;
    case "upload":
      return "已上传的图片";
    case "none":
      return "不使用图标，显示标题首字母";
    default:
      return "该来源暂未开放";
  }
}

/**
 * 真的去取一次那张图。占位图是 1×1 的透明 PNG —— 它「加载成功」但没有内容，
 * 与图标渲染那边的判断保持一致：宽高大于 1 才算取到。
 */
function probeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 1 && image.naturalHeight > 1);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

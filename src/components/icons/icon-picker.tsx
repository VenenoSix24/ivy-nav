"use client";

import { useRef, useState } from "react";
import { Ban, Loader2, Search, Sparkles, Upload } from "lucide-react";
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
}

const MAX_UPLOAD_BYTES = 512 * 1024;

export function IconPicker({ spec, onChange, url, title }: IconPickerProps) {
  const [emojiQuery, setEmojiQuery] = useState("");
  const [lucideQuery, setLucideQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  return (
    <div className="border-border rounded-xl border p-3">
      <div className="mb-3 flex items-center gap-3">
        <span
          aria-hidden
          className="border-hairline bg-glass-strong inline-grid size-12 place-items-center rounded-lg border text-[22px] leading-none"
        >
          <IconGlyph spec={spec} title={title || "?"} faviconSrc={previewFaviconSrc(url)} />
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
            自动读取该网站的图标，取不到时显示标题首字母。结果会缓存在服务器上，不会每次打开都重新抓。
          </p>
          <button
            type="button"
            onClick={() => onChange({ type: "favicon", value: null })}
            className={cn(
              "focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2",
              spec.type === "favicon"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-accent",
            )}
          >
            <Sparkles className="size-3.5" />
            使用网站图标
          </button>
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

function readError(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "error" in payload) {
    const { error } = payload as { error?: unknown };
    return typeof error === "string" ? error : null;
  }
  return null;
}

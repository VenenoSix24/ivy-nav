"use client";

/* eslint-disable @next/next/no-img-element -- 图标库的缩略图是几十像素的小图、且都走本地代理，
   next/image 反而要多一次优化往返 */
import { useEffect, useRef, useState } from "react";
import { Ban, ImageDown, Loader2, Plus, Search, Trash2, Upload } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { IconGlyph, iconBox, type IconSpec } from "@/components/icons/icon-glyph";
import { lucideNames, lucideRegistry } from "@/components/icons/lucide-registry";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emojiCatalog, searchEmoji } from "@/lib/icons/emoji";
import type { IconHit } from "@/lib/icons/library/types";
import { isLibraryPick, libraryFromPrelude, preludeOf, seedQuery } from "@/lib/icons/search-seed";
import {
  iconSource,
  isIconSourceId,
  type IconCandidate,
  type IconSourceId,
} from "@/lib/icons/sources";
import { libraryIconSrc, previewFaviconSrc } from "@/lib/icons/urls";
import { DEFAULT_ICON_FIT, ICON_FITS, type IconFitId } from "@/lib/icons/fit";
import { parseHttpUrl } from "@/lib/utils/url";

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
type TabId = "favicon" | "library" | "emoji" | "upload";

interface LibraryOption {
  id: string;
  label: string;
  hint: string;
  colorModes: string[];
  removable: boolean;
}

interface SearchState {
  library: string;
  query: string;
  hits: IconHit[];
  total: number;
}

/** 颜色选项：品牌色（每个图标自带）、原色、或指定一个十六进制。 */
type ColorPick = { kind: "brand" } | { kind: "original" } | { kind: "hex"; hex: string };

const MAX_UPLOAD_BYTES = 512 * 1024;
const LUCIDE = "lucide";

/** 重开面板时别又把页签丢回「自动」：上一次用的是哪一档就还停在哪一档。 */
function initialTab(spec: IconSpec): TabId {
  if (spec.type === "emoji") return "emoji";
  if (spec.type === "lucide") return "library";
  if (spec.type === "upload") return isLibraryPick(spec.value) ? "library" : "upload";
  return "favicon";
}

export function IconPicker({
  spec,
  onChange,
  url,
  title,
  initialFetched = false,
}: IconPickerProps) {
  const [tab, setTab] = useState<TabId>(() => initialTab(spec));

  // ---- 网站图标
  const [fetchState, setFetchState] = useState<FetchState>(initialFetched ? "ok" : "idle");
  const [candidates, setCandidates] = useState<IconCandidate[] | null>(null);
  const [autoOk, setAutoOk] = useState(initialFetched);

  // ---- 图标库
  const [libraries, setLibraries] = useState<LibraryOption[]>([]);
  const [library, setLibrary] = useState("");
  /**
   * 关键词：在框里打过字就听用户的，没打过就按标题或域名现算。
   * 之所以是「现算」而不是挂载时算一次：标题是输入网址之后才异步取回来的，
   * 取回来这一刻搜索框里就该有词了，不必等保存再重开。
   */
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const query = typedQuery ?? seedQuery(title, url);
  const [results, setResults] = useState<SearchState | null>(null);
  const [searching, setSearching] = useState(false);
  /** 按库记各家的颜色选择：换回来还是刚才那个色，不必用 effect 同步 */
  const [colorPicks, setColorPicks] = useState<Record<string, ColorPick>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // ---- 自建图标集
  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addMirror, setAddMirror] = useState(true);
  const [addBusy, setAddBusy] = useState(false);

  // ---- Emoji / 上传
  const [emojiQuery, setEmojiQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // 网址一换，之前那次获取就不作数了，免得拿着旧站点的结果当新站点的
  const lastUrl = useRef(url.trim());
  useEffect(() => {
    const next = url.trim();
    if (next === lastUrl.current) return;
    lastUrl.current = next;
    setFetchState("idle");
    setCandidates(null);
    setAutoOk(false);
  }, [url]);

  /**
   * 网址一填好就自己去抓一次候选，不必先点「获取图标」（按钮留着当「重新获取」）。
   *
   * 只在**打开面板之后新输入的网址**上抓：编辑已有条目时，重开一次面板就重新抓一轮
   * 是白费一次出网（每个候选来源都要走一遍），打开时就有的那个网址不自动抓 ——
   * 想看别的候选点按钮即可。只有这一档抓：每个来源都要出一次网，用户在别的档上
   * 打字时不该被这些请求陪着。
   */
  const autoUrl = parseHttpUrl(url) ? url.trim() : "";
  /** 打开面板那一刻的网址：就是它不触发自动获取 */
  const openedUrl = useRef(url.trim());
  const lastAutoFetch = useRef(url.trim());

  useEffect(() => {
    if (!autoUrl || tab !== "favicon") return;
    if (autoUrl === openedUrl.current || lastAutoFetch.current === autoUrl) return;

    const timer = setTimeout(() => {
      lastAutoFetch.current = autoUrl;
      void fetchCandidates();
    }, 1500);

    return () => clearTimeout(timer);
    // fetchCandidates 只读当前 url 与自身状态，不必进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUrl, tab]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/icons/library");
        const payload: unknown = await response.json().catch(() => null);
        const list = readLibraries(payload);
        if (cancelled || list.length === 0) return;
        setLibraries(list);
        // 上次挑的是哪个库就还选哪个（从落盘文件名的前缀里读回来）
        const preset = libraryFromPrelude(
          spec.type === "upload" ? spec.value : null,
          list.map((entry) => entry.id),
        );
        setLibrary((current) => current || preset || list[0]!.id || LUCIDE);
      } catch {
        // 拿不到列表就先只用 Lucide 那一档，不打扰用户
      }
    })();
    return () => {
      cancelled = true;
    };
    // 只在挂载时取一次：spec 是打开那一刻的快照，之后由用户自己改
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = libraries.find((entry) => entry.id === library) ?? null;
  const colorModes = current?.colorModes ?? [];
  const color: ColorPick =
    colorPicks[library] ??
    (colorModes.includes("brand") ? { kind: "brand" } : { kind: "original" });
  function chooseColor(pick: ColorPick) {
    setColorPicks((previous) => ({ ...previous, [library]: pick }));
  }

  /**
   * 搜索随打随搜（停 350ms 再问），一次一页；「显示更多」按同一关键词接着往下要。
   * 空关键词一个请求都不发 —— 库里几千几万个图标，没有关键词就不该往外搬。
   */
  useEffect(() => {
    if (!library || library === LUCIDE) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void runSearch(trimmed, 0, false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSearch 只读当前库与关键词
  }, [library, query]);

  async function runSearch(target: string, offset: number, append: boolean) {
    setSearching(true);
    const requested = library;

    try {
      const response = await fetch(
        `/api/icons/library/search?lib=${encodeURIComponent(requested)}&q=${encodeURIComponent(
          target,
        )}&offset=${offset}`,
      );
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setNote(readError(payload) ?? "搜索失败：请重试。");
        return;
      }

      const hits = readHits(payload);
      setResults((previous) =>
        append && previous && previous.library === requested && previous.query === target
          ? { ...previous, hits: [...previous.hits, ...hits] }
          : { library: requested, query: target, hits, total: readTotal(payload) },
      );
      setNote(null);
    } catch {
      setNote("无法连接服务器：请检查网络后重试。");
    } finally {
      setSearching(false);
    }
  }

  const faviconHint =
    fetchState === "failed"
      ? "这个网站没能取到图标：可以改用图标库、Emoji 或自己上传，也可以就这样保存（会显示标题首字母）。"
      : fetchState === "ok"
        ? "挨着试出来的几个方案，点一张就用它。"
        : fetchState === "loading"
          ? "正在逐个来源试取…"
          : url.trim()
            ? "还没获取：点左边的按钮，把能取到的图标都列出来。"
            : "先在上面填上网址，再来获取图标。";

  /**
   * 列出所有方案。以前是一次只给一张（抓到哪个算哪个），用户无从知道还有别的取法；
   * 现在每个来源各取各的，取不到、只给占位图的都照样列出来。
   */
  async function fetchCandidates() {
    const target = url.trim();
    if (!target) return;

    // 不动当前选中的方案：这一步只是把候选列出来，选哪张得用户自己点
    setFetchState("loading");
    setCandidates(null);

    try {
      const response = await fetch(`/api/icons/candidates?url=${encodeURIComponent(target)}`);
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(readError(payload) ?? `获取失败（HTTP ${response.status}）：请重试。`);
        setFetchState("failed");
        return;
      }

      const list = readCandidates(payload);
      // 自动链那一张也要真看一眼：占位图是「加载成功但没有内容」
      const autoResolved = await probeImage(previewFaviconSrc(target));
      setCandidates(list);
      setAutoOk(autoResolved);
      setFetchState(autoResolved || list.some((entry) => entry.status === "ok") ? "ok" : "failed");
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
      setFetchState("failed");
    }
  }

  function hitColor(hit: IconHit): string | null {
    if (color.kind === "brand") return hit.color;
    if (color.kind === "hex") return color.hex;
    return null;
  }

  /** 挑一张：服务端把它下载到本地上传目录，之后这张图标就不再看那个库的脸色了。 */
  async function pickHit(hit: IconHit) {
    setPicking(hit.name);
    try {
      const response = await fetch("/api/icons/library/pick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ library, name: hit.name, color: hitColor(hit) }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(readError(payload) ?? `选用失败（HTTP ${response.status}）：请重试。`);
        return;
      }

      const filename = (payload as { filename?: unknown } | null)?.filename;
      if (typeof filename !== "string") {
        toast.error("选用结果不完整：请重试。");
        return;
      }

      onChange({ ...spec, type: "upload", value: filename });
      toast.success(`已选用「${hit.title}」`);
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    } finally {
      setPicking(null);
    }
  }

  async function addSet() {
    const target = addUrl.trim();
    if (!target) return;

    setAddBusy(true);
    try {
      const response = await fetch("/api/icon-sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // raw.githubusercontent 在很多网络里连不上，地址带它就一并把镜像打开
        body: JSON.stringify({
          url: target,
          mirror: addMirror || target.includes("raw.githubusercontent.com"),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(readError(payload) ?? `加入失败（HTTP ${response.status}）：请重试。`);
        return;
      }

      const id = (payload as { id?: unknown } | null)?.id;
      const count = (payload as { count?: unknown } | null)?.count;
      const name = (payload as { name?: unknown } | null)?.name;
      await reloadLibraries();
      if (typeof id === "number") setLibrary(`set:${id}`);
      setAddOpen(false);
      setAddUrl("");
      toast.success(
        `已加入「${typeof name === "string" ? name : "图标集"}」，${
          typeof count === "number" ? count : 0
        } 个图标`,
      );
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    } finally {
      setAddBusy(false);
    }
  }

  async function reloadLibraries(): Promise<void> {
    const response = await fetch("/api/icons/library").catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    const list = readLibraries(payload);
    if (list.length > 0) setLibraries(list);
  }

  async function removeSet() {
    if (!current?.removable) return;
    const id = current.id.replace("set:", "");
    if (!window.confirm(`删除图标集「${current.label}」？已经用上的图标不会消失。`)) return;

    try {
      const response = await fetch(`/api/icon-sets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(readError(payload) ?? "删除失败：请重试。");
        return;
      }
      const list = await fetch("/api/icons/library").catch(() => null);
      const next = list ? readLibraries(await list.json().catch(() => null)) : [];
      if (next.length > 0) setLibraries(next);
      setLibrary(next.find((entry) => entry.id !== current.id)?.id ?? LUCIDE);
      toast.success("图标集已删除");
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    }
  }

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

      onChange({ ...spec, type: "upload", value: filename });
      toast.success("图标已上传");
    } catch {
      toast.error("无法连接服务器：请检查网络后重试。");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const plate = spec.plate !== false;
  const mono = spec.mono === true;
  const canMono = spec.type === "upload" && Boolean(spec.value?.endsWith(".svg"));
  // 摆法只对图片类有意义（Emoji、Lucide 与首字母都是矢量字体，铺不铺满由字号说了算）
  const canFit = spec.type === "upload" || spec.type === "favicon";
  const fit = spec.fit ?? DEFAULT_ICON_FIT;
  const fitHint = ICON_FITS.find((entry) => entry.id === fit)?.hint ?? "";

  const builtIns = libraries.filter((entry) => !entry.removable);
  const sets = libraries.filter((entry) => entry.removable);
  const lucideChip: LibraryOption = {
    id: LUCIDE,
    label: "Lucide",
    hint: `${lucideNames.length} 个线性图标`,
    colorModes: [],
    removable: false,
  };
  const chips = [...builtIns, lucideChip, ...sets];
  const lucideResults = filterLucide(library === LUCIDE ? query : "");

  // 结果带着自己的库与关键词：换了库或改了词还没回来时，界面上不会先露出上一批
  const fresh = results && results.library === library && results.query === query.trim();
  const shownHits = fresh ? results.hits : null;
  const shownTotal = fresh ? results.total : 0;
  const canLoadMore = shownHits !== null && shownHits.length < shownTotal;
  const searchingThis = library !== LUCIDE;

  return (
    <div className="border-border rounded-xl border p-3">
      <div className="mb-3 flex items-center gap-3">
        <span
          aria-hidden
          style={iconBox(plate, spec.fit ?? DEFAULT_ICON_FIT)}
          className={cn(
            "inline-grid size-12 shrink-0 place-items-center leading-none",
            plate && "plate-lift border-hairline bg-glass-strong rounded-lg border",
          )}
        >
          <IconGlyph
            spec={spec}
            title={title || "?"}
            faviconSrc={
              fetchState === "ok" && url.trim()
                ? previewFaviconSrc(
                    url,
                    spec.type === "favicon" ? normalizeFavicon(spec.value) : null,
                  )
                : ""
            }
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

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-[12px]">
          <Switch
            size="sm"
            checked={plate}
            onCheckedChange={() => onChange({ ...spec, plate: !plate })}
          />
          底板
        </label>
        {canMono ? (
          <label className="flex items-center gap-2 text-[12px]">
            <Switch
              size="sm"
              checked={mono}
              onCheckedChange={() => onChange({ ...spec, mono: !mono })}
            />
            跟随主题
          </label>
        ) : null}
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
          {canMono
            ? "跟随主题：浅色下按上面选的色，深色下转成前景色（黑图标不会消失）"
            : "底板：图标底下那层描边与玻璃底，应用类图标自带外形时可以不套"}
        </span>
      </div>

      {canFit ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-muted-foreground text-[12px]">图标大小</span>
          <div className="flex gap-1">
            {ICON_FITS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={fit === entry.id}
                onClick={() => onChange({ ...spec, fit: entry.id as IconFitId })}
                className={cn(
                  "focus-visible:outline-ring rounded-full px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-2",
                  fit === entry.id
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
            {fitHint}
          </span>
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <TabsList className="w-full">
          <TabsTrigger value="favicon">自动</TabsTrigger>
          <TabsTrigger value="library">图标库</TabsTrigger>
          <TabsTrigger value="emoji">Emoji</TabsTrigger>
          <TabsTrigger value="upload">上传</TabsTrigger>
        </TabsList>

        <TabsContent value="favicon" className="pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!url.trim() || fetchState === "loading"}
              onClick={() => void fetchCandidates()}
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

          {candidates === null && !autoOk ? null : (
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {autoOk ? (
                <CandidateTile
                  label="自动"
                  note="按顺序第一个"
                  active={spec.type === "favicon" && spec.value === null}
                  src={previewFaviconSrc(url)}
                  onPick={() => onChange({ ...spec, type: "favicon", value: null })}
                />
              ) : null}
              {(candidates ?? []).map((candidate) => {
                const meta = iconSource(candidate.source);
                const ok = candidate.status === "ok";
                return (
                  <CandidateTile
                    key={candidate.source}
                    label={candidate.label}
                    note={
                      ok
                        ? meta?.thirdParty
                          ? "第三方服务"
                          : "网站自己声明"
                        : candidate.status === "placeholder"
                          ? "只给占位图"
                          : "取不到"
                    }
                    active={spec.type === "favicon" && spec.value === candidate.source}
                    src={ok ? previewFaviconSrc(url, candidate.source) : ""}
                    onPick={() => onChange({ ...spec, type: "favicon", value: candidate.source })}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="pt-3">
          <SearchField
            value={query}
            onChange={setTypedQuery}
            placeholder={
              library === LUCIDE
                ? `搜索 ${lucideNames.length} 个线性图标（英文名）`
                : "搜索图标（英文名，换库不用重输）"
            }
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {chips.map((entry) => (
              <button
                key={entry.id}
                type="button"
                title={entry.hint}
                onClick={() => setLibrary(entry.id)}
                className={cn(
                  "focus-visible:outline-ring h-7 max-w-[11rem] truncate rounded-full border px-2.5 text-[12px] transition-colors focus-visible:outline-2",
                  library === entry.id
                    ? "border-primary bg-accent text-primary"
                    : "border-hairline hover:bg-secondary",
                )}
              >
                {entry.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddOpen((open) => !open)}
              title="加入一份自建图标集（JSON 地址）"
              className={cn(
                "focus-visible:outline-ring inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] transition-colors focus-visible:outline-2",
                addOpen ? "border-primary text-primary" : "border-hairline hover:bg-secondary",
              )}
            >
              <Plus className="size-3.5" />
              图标集
            </button>
            {current?.removable ? (
              <button
                type="button"
                onClick={() => void removeSet()}
                title={`删除「${current.label}」`}
                className="text-muted-foreground hover:text-destructive focus-visible:outline-ring inline-flex h-7 items-center rounded-full px-2 transition-colors focus-visible:outline-2"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>

          {addOpen ? (
            <div className="border-hairline mt-2 space-y-1.5 rounded-xl border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={addUrl}
                  onChange={(event) => setAddUrl(event.target.value)}
                  placeholder="图标集 JSON 地址"
                  autoComplete="off"
                  spellCheck={false}
                  className="border-input h-8 min-w-0 flex-1 rounded-lg border px-2.5 text-[12px] outline-none"
                />
                <label className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                  <input
                    type="checkbox"
                    checked={addMirror}
                    onChange={(event) => setAddMirror(event.target.checked)}
                    className="accent-primary size-3.5"
                  />
                  镜像
                </label>
                <button
                  type="button"
                  disabled={addBusy || !addUrl.trim()}
                  onClick={() => void addSet()}
                  className="bg-secondary hover:bg-accent focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] transition-colors focus-visible:outline-2 disabled:opacity-60"
                >
                  {addBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {addBusy ? "抓取中…" : "加入"}
                </button>
              </div>
              <p className="text-muted-foreground text-[11px]">
                地址带回环/内网会被拦下；勾「镜像」走 jsDelivr。
              </p>
            </div>
          ) : null}

          {library !== LUCIDE && colorModes.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">颜色</span>
              {colorModes.includes("brand") ? (
                <ColorChip
                  label="品牌色"
                  active={color.kind === "brand"}
                  onClick={() => chooseColor({ kind: "brand" })}
                />
              ) : null}
              {colorModes.includes("original") ? (
                <ColorChip
                  label="原色"
                  active={color.kind === "original"}
                  onClick={() => chooseColor({ kind: "original" })}
                />
              ) : null}
              {colorModes.includes("mono") ? (
                <>
                  <ColorChip
                    label="黑"
                    hex="#000000"
                    active={color.kind === "hex" && color.hex === "#000000"}
                    onClick={() => chooseColor({ kind: "hex", hex: "#000000" })}
                  />
                  <ColorChip
                    label="白"
                    hex="#ffffff"
                    active={color.kind === "hex" && color.hex === "#ffffff"}
                    onClick={() => chooseColor({ kind: "hex", hex: "#ffffff" })}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {library === LUCIDE ? (
            <>
              <div className="no-scrollbar mt-3 grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
                {lucideResults.map((name) => {
                  const Icon = lucideRegistry[name as keyof typeof lucideRegistry];
                  const active = spec.type === "lucide" && spec.value === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => onChange({ ...spec, type: "lucide", value: name })}
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
              <p className="text-muted-foreground mt-2 text-[11px]">
                {lucideResults.length === 0
                  ? "没有匹配的图标：换个词试试。"
                  : `显示 ${lucideResults.length} / ${lucideNames.length} 个（本地登记表，不用联网）。`}
              </p>
            </>
          ) : (
            <>
              <div className="no-scrollbar mt-3 grid max-h-52 grid-cols-6 gap-1 overflow-y-auto">
                {(shownHits ?? []).map((hit) => (
                  <button
                    key={hit.name}
                    type="button"
                    title={[
                      hit.title,
                      hit.note,
                      hit.guidelines ? `品牌规范：${hit.guidelines}` : null,
                    ]
                      .filter(Boolean)
                      .join("｜")}
                    disabled={picking !== null}
                    onClick={() => void pickHit(hit)}
                    className="hover:bg-secondary focus-visible:outline-ring flex min-w-0 flex-col items-center gap-1 rounded-lg p-1 transition-colors focus-visible:outline-2 disabled:opacity-60"
                  >
                    <span className="grid size-9 place-items-center">
                      {picking === hit.name ? (
                        <Loader2 className="text-muted-foreground size-4 animate-spin" />
                      ) : (
                        <img
                          src={libraryIconSrc(library, hit.name, hitColor(hit))}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-6 object-contain"
                        />
                      )}
                    </span>
                    <span className="text-muted-foreground w-full truncate text-[10px]">
                      {hit.title}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[11px]",
                    note ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {searching && searchingThis
                    ? "搜索中…"
                    : note
                      ? note
                      : !query.trim()
                        ? "输入关键词开始搜索：点哪张就把哪张下载到本地。"
                        : shownHits === null
                          ? "…"
                          : shownHits.length === 0
                            ? "没有匹配的图标：换个词试试。"
                            : `显示 ${shownHits.length} / ${shownTotal} 个，点哪张就把哪张下载到本地。`}
                </span>
                {canLoadMore ? (
                  <button
                    type="button"
                    disabled={searching}
                    onClick={() => void runSearch(query.trim(), shownHits.length, true)}
                    className="text-primary focus-visible:outline-ring shrink-0 rounded-md text-[11px] transition-opacity hover:opacity-80 focus-visible:outline-2 disabled:opacity-50"
                  >
                    显示更多
                  </button>
                ) : null}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="emoji" className="pt-3">
          <SearchField
            value={emojiQuery}
            onChange={setEmojiQuery}
            placeholder={`搜索 ${emojiCatalog.length} 个常用 emoji，支持中文`}
          />
          <div className="no-scrollbar mt-3 grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
            {searchEmoji(emojiQuery).map((entry) => (
              <button
                key={entry.char}
                type="button"
                title={`${entry.group}｜${entry.keywords.slice(0, 3).join(" ")}`}
                onClick={() => onChange({ ...spec, type: "emoji", value: entry.char })}
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
          {searchEmoji(emojiQuery).length === 0 ? (
            <p className="text-muted-foreground mt-3 text-[12px]">没有匹配的 emoji：换个词试试。</p>
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

/** 一个方案的缩略图。取不到的照样占一格：摆出来才知道「试过哪些、为什么没得挑」。 */
function CandidateTile({
  label,
  note,
  active,
  src,
  onPick,
}: {
  label: string;
  note: string;
  active: boolean;
  src: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={`${label}：${note}`}
      className={cn(
        "focus-visible:outline-ring flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 transition-colors focus-visible:outline-2",
        active ? "border-primary bg-accent" : "border-hairline hover:bg-secondary",
        src ? "" : "opacity-60",
      )}
    >
      <span className="grid size-7 place-items-center">
        {src ? (
          <img src={src} alt="" className="size-7 object-contain" loading="lazy" decoding="async" />
        ) : (
          <Ban className="text-muted-foreground size-4" aria-hidden />
        )}
      </span>
      <span className={cn("w-full truncate text-[11px]", active && "text-primary")}>{label}</span>
      <span className="text-muted-foreground w-full truncate text-[10px]">{note}</span>
    </button>
  );
}

function ColorChip({
  label,
  hex,
  active,
  onClick,
}: {
  label: string;
  hex?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-visible:outline-ring inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition-colors focus-visible:outline-2",
        active ? "border-primary text-primary" : "border-hairline hover:bg-secondary",
      )}
    >
      {hex ? (
        <span
          aria-hidden
          className="border-hairline size-3 rounded-full border"
          style={{ background: hex }}
        />
      ) : null}
      {label}
    </button>
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

/** 条目上存的是「图标库里的哪一张」时，文件名前缀写了来路，这里把它读回来给人看。 */
function describeUpload(value: string | null): string {
  const prelude = preludeOf(value);
  if (!prelude) return "已上传的图片";
  return `图标库：${prelude.replace(/-[0-9a-f]{3,8}$/, "")}`;
}

function describe(spec: IconSpec): string {
  switch (spec.type) {
    case "favicon": {
      const source = iconSource(spec.value);
      return source ? `网站图标：${source.label}` : "网站图标：自动挑一张";
    }
    case "emoji":
      return `Emoji ${spec.value ?? ""}`;
    case "lucide":
      return `Lucide：${spec.value ?? ""}`;
    case "upload":
      return describeUpload(spec.value);
    case "none":
      return "不使用图标，显示标题首字母";
    default:
      return "该来源暂未开放";
  }
}

function normalizeFavicon(value: string | null): IconSourceId | null {
  return isIconSourceId(value) ? value : null;
}

function readLibraries(payload: unknown): LibraryOption[] {
  const list = (payload as { libraries?: unknown } | null)?.libraries;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    const item = entry as Partial<LibraryOption>;
    if (typeof item.id !== "string" || typeof item.label !== "string") return [];
    return [
      {
        id: item.id,
        label: item.label,
        hint: typeof item.hint === "string" ? item.hint : "",
        colorModes: Array.isArray(item.colorModes)
          ? item.colorModes.filter((mode): mode is string => typeof mode === "string")
          : [],
        removable: item.removable === true,
      },
    ];
  });
}

/** 接口回来的候选列表同样不照单全收：来源名与状态都得认得。 */
function readCandidates(payload: unknown): IconCandidate[] {
  const list = (payload as { candidates?: unknown } | null)?.candidates;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    const candidate = entry as { source?: unknown; label?: unknown; status?: unknown };
    if (!isIconSourceId(candidate.source)) return [];
    const status =
      candidate.status === "ok" || candidate.status === "placeholder" ? candidate.status : "miss";
    return [
      {
        source: candidate.source,
        label: typeof candidate.label === "string" ? candidate.label : candidate.source,
        status,
      },
    ];
  });
}

function readHits(payload: unknown): IconHit[] {
  const list = (payload as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    const hit = entry as Partial<IconHit>;
    if (typeof hit.name !== "string" || !hit.name) return [];
    return [
      {
        name: hit.name,
        title: typeof hit.title === "string" && hit.title ? hit.title : hit.name,
        color: typeof hit.color === "string" ? hit.color : null,
        note: typeof hit.note === "string" ? hit.note : null,
        guidelines: typeof hit.guidelines === "string" ? hit.guidelines : null,
      },
    ];
  });
}

function readTotal(payload: unknown): number {
  const total = (payload as { total?: unknown } | null)?.total;
  return typeof total === "number" && total >= 0 ? total : 0;
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

/** 取图标的方案清单；这里不引 node 模块，浏览器端也要用 */
export const ICON_SOURCE_IDS = [
  /** 页面里 <link rel="icon"> 声明的 */
  "declared",
  /** PWA manifest 里声明的 */
  "manifest",
  "/favicon.ico",
  "favicon.im",
  "icon.horse",
] as const;

export type IconSourceId = (typeof ICON_SOURCE_IDS)[number];

export interface IconSourceMeta {
  id: IconSourceId;
  /** 缩略图下面那行字 */
  label: string;
  /** 第三方服务要标明 */
  thirdParty: boolean;
}

export const ICON_SOURCES: readonly IconSourceMeta[] = [
  { id: "declared", label: "网站声明", thirdParty: false },
  { id: "manifest", label: "PWA 清单", thirdParty: false },
  { id: "/favicon.ico", label: "/favicon.ico", thirdParty: false },
  { id: "favicon.im", label: "favicon.im", thirdParty: true },
  { id: "icon.horse", label: "icon.horse", thirdParty: true },
];

/** 一次来源尝试的结果：ok / placeholder / miss */
export type IconCandidateStatus = "ok" | "placeholder" | "miss";

export interface IconCandidate {
  source: IconSourceId;
  label: string;
  status: IconCandidateStatus;
}

const BY_ID = new Map(ICON_SOURCES.map((source) => [source.id, source]));

export function iconSource(id: string | null | undefined): IconSourceMeta | null {
  return id ? (BY_ID.get(id as IconSourceId) ?? null) : null;
}

export function isIconSourceId(value: unknown): value is IconSourceId {
  return typeof value === "string" && BY_ID.has(value as IconSourceId);
}

/** 条目上存的图标来源（favicon 类型专有），空值表示按顺序自己挑 */
export function normalizeIconSource(value: string | null | undefined): IconSourceId | null {
  return isIconSourceId(value) ? value : null;
}

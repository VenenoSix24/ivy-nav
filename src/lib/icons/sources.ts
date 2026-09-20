/**
 * 取图标的「方案」清单。这张表同时被两边用：服务端按它决定去问谁、按什么顺序问；
 * 选择器拿它的名称给用户看「这一张是谁给的」。所以这里一个 node 模块都不许引
 * （`favicon.ts` 依赖它，反向依赖会把 fs / crypto 拖进浏览器包）。
 */
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
  /** 第三方服务要标明：这一张不是站点自己给的 */
  thirdParty: boolean;
}

export const ICON_SOURCES: readonly IconSourceMeta[] = [
  { id: "declared", label: "网站声明", thirdParty: false },
  { id: "manifest", label: "PWA 清单", thirdParty: false },
  { id: "/favicon.ico", label: "/favicon.ico", thirdParty: false },
  { id: "favicon.im", label: "favicon.im", thirdParty: true },
  { id: "icon.horse", label: "icon.horse", thirdParty: true },
];

/**
 * 一次来源尝试的结果。三种状态分开报，用户才知道该不该点它：
 * 「服务活着但只回它自己那张占位图」与「压根没取到」在看图的时候是两件事。
 */
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

/** 条目上存的图标来源（favicon 类型专有）—— 空值就是「按顺序自己挑」。 */
export function normalizeIconSource(value: string | null | undefined): IconSourceId | null {
  return isIconSourceId(value) ? value : null;
}

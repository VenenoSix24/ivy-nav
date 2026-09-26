import type { IconType, Visibility } from "@/db/schema";
import type { IconFitId } from "@/lib/icons/fit";
import type { LayoutId } from "@/lib/settings/homepage";

export type { IconType, Visibility };

export interface PortalItem {
  id: number;
  categoryId: number | null;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  iconType: IconType;
  iconValue: string | null;
  /** 图标底下要不要那层图标遮罩 */
  iconPlate: boolean;
  /** 单色图标是否跟随主题前景色 */
  iconMono: boolean;
  /** 图标在图标遮罩里怎么摆（条目没设过就是设置页里那个默认） */
  iconFit: IconFitId;
  /** 条目自己设的那一份；空值表示跟随 defaultIconFit */
  iconFitOwn: IconFitId | null;
  tags: string[];
  visibility: Visibility;
  featured: boolean;
}

export interface PortalCategory {
  id: number;
  name: string;
  description: string | null;
  visibleOnHomepage: boolean;
  /** private 表示整类对匿名隐藏 */
  visibility: Visibility;
  /** 空值表示跟随默认布局（卡片） */
  layout: LayoutId | null;
}

/** Exactly what a visitor's browser receives. */
export interface PortalData {
  categories: PortalCategory[];
  items: PortalItem[];
  /** 条目没自己设过 iconFit 时用的默认值（设置页里选） */
  defaultIconFit: IconFitId;
}

/** 设置页「标签」一节用的：标签与用它的条目数 */
export interface TagSummary {
  id: number;
  name: string;
  itemCount: number;
}

export const ALL_CATEGORIES = "all" as const;
/** 未归档条目的伪分类，只在管理视图里出现 */
export const INBOX = "inbox" as const;
export type CategoryFilter = typeof ALL_CATEGORIES | typeof INBOX | number;

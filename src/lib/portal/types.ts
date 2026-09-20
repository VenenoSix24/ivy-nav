import type { IconType, Visibility } from "@/db/schema";
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
  tags: string[];
  visibility: Visibility;
  featured: boolean;
}

export interface PortalCategory {
  id: number;
  name: string;
  description: string | null;
  visibleOnHomepage: boolean;
  /** 空值表示跟随默认布局（卡片） */
  layout: LayoutId | null;
}

/** Exactly what a visitor's browser receives — nothing outside this shape leaves the server. */
export interface PortalData {
  categories: PortalCategory[];
  items: PortalItem[];
}

export const ALL_CATEGORIES = "all" as const;
/** 未归档条目的伪分类，只在管理视图里出现（设计文档 §19）。 */
export const INBOX = "inbox" as const;
export type CategoryFilter = typeof ALL_CATEGORIES | typeof INBOX | number;

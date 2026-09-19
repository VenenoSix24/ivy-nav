import type { IconType, Visibility } from "@/db/schema";

export type { Visibility };

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
